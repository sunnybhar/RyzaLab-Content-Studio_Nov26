import {generationRulesEvidence} from "../lib/studio/generation-rules-evidence";
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { generationInput } from "../lib/studio/generation";
import { hydrateAgentFiles } from "../lib/studio/agent-file-extract";
import { quote, frozenSystem } from "../lib/studio/pricing";
import type { Channel } from "../lib/studio/types";
const now = "2026-11-03T15:00:00Z";
for (const channel of ["LinkedIn", "Newsletter"] as Channel[])
  test(`${channel} writing actually freezes the matching Instructions, skills, knowledge and voice in the model context`, async () => {
    let state = initialState(DEMO_ACTOR, true);
    const content = state.contents[0];
    content.channel = channel;
    content.format = channel === "Newsletter" ? "Newsletter" : "Text post";
    content.text = "";
    content.media = structuredClone(EMPTY_MEDIA);
    content.workflowId = state.workflows.find((w) => w.channel === channel)!.id;
    state.agentRuleFiles = (["LinkedIn", "Newsletter"] as Channel[]).flatMap(
      (ch) =>
        (["instructions", "context"] as const).map((slot) => {
          const text =
            slot === "instructions"
              ? `# ${ch} Instructions\nUse ${ch} signature structure.\n## Skill guidance\n${ch} brand guard skill.`
              : `# ${ch} knowledge\n${ch} unique brand context.`;
          return {
            id: `${ch}-${slot}`,
            channel: ch,
            slot,
            fileName: `${ch}-${slot}.md`,
            base64: Buffer.from(text).toString("base64"),
            byteSize: Buffer.byteLength(text),
            uploadedBy: DEMO_ACTOR.email,
            uploadedAt: now,
          };
        }),
    );
    state.agentVoiceExamples = [
      {
        id: "shared-voice",
        title: "Original founder example",
        contentType: "post",
        channel: "Shared",
        text: "UNIQUE_SHARED_FOUNDER_VOICE",
        createdBy: DEMO_ACTOR.email,
        createdAt: now,
        requestKey: "shared",
      },
    ];
    state = await hydrateAgentFiles(state, channel);
    const workflow = state.workflows.find((w) => w.channel === channel)!;
    state.connections.push({
      id: "writing",
      title: "Claude",
      provider: "anthropic",
      model: "fixture-model",
      function: "text",
      status: "validated",
      hasKey: true,
      updatedAt: now,
      ...{ maxRequestCost: 18 },
    });
    workflow.connectionId = "writing";
    state.settings.qualifiedRates = [
      {
        provider: "anthropic",
        model: "fixture-model",
        function: "text",
        currency: "USD",
        inputCentsPerMillion: 200,
        outputCentsPerMillion: 1000,
        maxInputBytes: 65536,
        maxOutputTokens: 4096,
        source: "https://example.com/pricing",
        verifiedAt: "2026-11-03",
        qualified: true,
      },
    ];
    const command = generationInput(state, DEMO_ACTOR, {
      contentId: content.id,
      expectedRevision: content.revision,
      kind: "text",
      idempotencyKey: `write-${channel}`,
    });
    const priced = quote(state, command);
    const next = applyCommand(state, DEMO_ACTOR, command, {
      now,
      demo: true,
      canonicalGeneration: true,
      quotedCost: priced.cost,
      pricingSnapshot: priced.pricingSnapshot,
    });
    const job = next.jobs[0],
      system = frozenSystem(job);
    assert.ok(job.systemSnapshot);
    assert.equal(generationRulesEvidence(job).context!.rules.length,2);
    assert.equal(generationRulesEvidence(job).exact,true);
    assert.equal(job.agentContextSnapshot!.rules.length, 2);
    assert.match(system, new RegExp(`${channel} signature structure`));
    assert.match(system, new RegExp(`${channel} brand guard skill`));
    assert.match(system, new RegExp(`${channel} unique brand context`));
    assert.match(system, /UNIQUE_SHARED_FOUNDER_VOICE/);
    const other = channel === "LinkedIn" ? "Newsletter" : "LinkedIn";
    assert.doesNotMatch(system, new RegExp(`${other} unique brand context`));
    assert.match(system, channel === "Newsletter" ? /1,200–1,600/ : /180–250/);
    next.agentRuleFiles!.find(
      (file) => file.channel === channel && file.slot === "instructions",
    )!.extractedText = "MODIFIED_AFTER_ENQUEUE";
    assert.equal(frozenSystem(job), system);
    assert.doesNotMatch(frozenSystem(job), /MODIFIED_AFTER_ENQUEUE/);
  });
