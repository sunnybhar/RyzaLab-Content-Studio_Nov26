import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { ideaJobInput } from "../lib/studio/idea-generation";
import { generationInput } from "../lib/studio/generation";
import { quote } from "../lib/studio/pricing";
import { runProvider } from "../lib/studio/providers";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import {
  currentCopyAcceptance,
  copyBlockers,
} from "../lib/studio/solo-quality";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
import type { Channel, Job, StudioState } from "../lib/studio/types";
const now = "2026-10-30T12:00:00Z",
  actor = DEMO_ACTOR;
const samples = [
  {
    name: "AI LinkedIn — cited handoff checklist",
    channel: "LinkedIn",
    ai: true,
  },
  {
    name: "AI LinkedIn — missing personal fact requires editing",
    channel: "LinkedIn",
    ai: true,
    question: true,
  },
  {
    name: "AI Newsletter — adapt a LinkedIn source",
    channel: "Newsletter",
    ai: true,
    adapt: true,
  },
  {
    name: "Manual LinkedIn — idea through calendar",
    channel: "LinkedIn",
    ai: false,
  },
  {
    name: "Manual Newsletter — adapt Reddit source",
    channel: "Newsletter",
    ai: false,
    adapt: true,
  },
] as const;
function setup() {
  let s = initialState(actor, true);
  s = applyCommand(
    s,
    actor,
    {
      type: "policy.adoptSolo",
      expectedRuleVersion: s.settings.protectedVersion,
      packageCap: 50,
      monthlyCap: 500,
      requireIndependentReview: false,
      autoDraft: false,
      autoReview: false,
    },
    { demo: true, now },
  );
  s.settings.requestCap = 50;
  s.settings.confirmationThreshold = 50;
  s.settings.qualifiedRates = [];
  for (const kind of ["ideas", "text"] as const) {
    s.connections.push({
      id: kind,
      title: `Fixture ${kind}`,
      provider: "anthropic",
      model: "synthetic-model",
      function: kind,
      hasKey: true,
      status: "validated",
      updatedAt: now,
      ...{ maxRequestCost: 50 },
    });
    s.settings.qualifiedRates.push({
      provider: "anthropic",
      model: "synthetic-model",
      function: kind,
      currency: "USD",
      fixedCents: 10,
      inputCentsPerMillion: 100,
      outputCentsPerMillion: 500,
      maxInputBytes: 500000,
      maxOutputTokens: 4096,
      source: "https://example.com/fixture-prices",
      verifiedAt: "2026-10-29",
      qualified: true,
    });
  }
  for (const w of s.workflows)
    w.functionConnections = {
      ...w.functionConnections,
      ideas: "ideas",
      text: "text",
    };
  return s;
}
function cmd(s: StudioState, command: unknown) {
  return applyCommand(s, actor, command, { now });
}
async function mockProvider(job: Job, s: StudioState, payload: unknown) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, request) => {
    calls++;
    assert.equal(String(url), "https://api.anthropic.com/v1/messages");
    const body = JSON.parse(String(request?.body));
    assert.equal(body.model, "synthetic-model");
    return new Response(
      JSON.stringify({
        stop_reason: "end_turn",
        content: [{ type: "text", text: JSON.stringify(payload) }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const output = await runProvider(
      job,
      s.connections.find((c) => c.id === job.connectionId)!,
      "synthetic-fixture-key",
    );
    assert.equal(calls, 1);
    return output;
  } finally {
    globalThis.fetch = original;
  }
}
for (const sample of samples)
  test(`LOCAL MOCK ONLY: ${sample.name}`, async () => {
    let s = setup();
    const channel = sample.channel as Channel;
    const title = sample.name;
    let ideaId: string | undefined;
    const researchJobIds = sample.name.includes("cited handoff")
      ? ["local-research"]
      : [];
    if (researchJobIds.length)
      s.jobs.push({
        id: "local-research",
        kind: "research",
        channel,
        prompt: "Synthetic public handoff question",
        connectionId: "research",
        estimate: 2,
        actual: 2,
        reserved: 0,
        state: "succeeded",
        attempt: 1,
        idempotencyKey: "local-cited",
        createdBy: actor.email,
        createdAt: now,
        result: JSON.stringify({
          version: 1,
          summary: "Synthetic source material: a routine and contacts.",
          citations: [
            {
              url: "https://example.com/fixture-source",
              title: "Synthetic source — not live research",
              citedText: "A routine and contacts.",
            },
          ],
          searchesObserved: 1,
          stopReason: "end_turn",
          errors: [],
          status: "cited_research",
          notice: "Local test fixture, not live source verification.",
        }),
      });
    if (sample.ai) {
      const request = ideaJobInput(s, actor, {
        channel,
        topic: title,
        audience: "Family caregivers",
        quantity: 3,
        research: Boolean(researchJobIds.length),
        researchJobIds,
        sourceText: "Neutral fixture material only",
        idempotencyKey: "three-ideas",
      });
      const priced = quote(s, request);
      s = applyCommand(s, actor, request, {
        now,
        quotedCost: priced.cost,
        pricingSnapshot: priced.pricingSnapshot,
      });
      const job = s.jobs[0];
      assert.equal(canDispatchJob(s, actor, job), true);
      const ideas = {
        ideas: Array.from({ length: 3 }, (_, i) => ({
          title: `${title} ${i + 1}`,
          brief: "Explain a household routine and a useful handoff question.",
          audience: "Family caregivers",
          format: channel === "Newsletter" ? "Newsletter" : "Text post",
          sources: [],
        })),
      };
      const result = await mockProvider(job, s, ideas);
      job.state = "succeeded";
      job.result = result.text;
      job.actual = job.reserved;
      job.reserved = 0;
      s = cmd(s, { type: "idea.importSavedResult", jobId: job.id });
      const imported = s.ideas.filter((i) => i.generationRunId === job.id);
      assert.equal(imported.length, 3);
      ideaId = imported[0].id;
    } else {
      s = cmd(s, {
        type: "idea.create",
        channel,
        title,
        brief: "A manually selected household handoff topic.",
      });
      ideaId = s.ideas[0].id;
    }
    if ("adapt" in sample && sample.adapt) {
      const source = s.contents[0];
      source.channel = sample.ai ? "LinkedIn" : "Reddit";
      source.text =
        "A written handoff can list the routine and who to contact.";
      source.metadata = "";
      source.media = structuredClone(EMPTY_MEDIA);
      s = cmd(s, {
        type: "content.newsletter",
        sourceKind: "content",
        sourceId: source.id,
        expectedRevision: source.revision,
      });
      assert.equal(s.contents[0].newsletterSource?.text, source.text);
    } else {
      s = cmd(s, {
        type: "idea.use",
        id: ideaId,
        format: "Text post",
        account: "RyzaLab",
      });
      const count = s.contents.length;
      s = cmd(s, {
        type: "idea.use",
        id: ideaId,
        format: "Text post",
        account: "RyzaLab",
      });
      assert.equal(s.contents.length, count);
    }
    let c = s.contents[0];
    assert.equal(c.channel, channel);
    const body =
      channel === "Newsletter"
        ? "A clearer household handoff\n\nWrite down the routine, the person to call and the fallback. Review the document together before relying on it."
        : "A useful household handoff can list the routine, who to call and what to do if the usual person is away.";
    if (sample.ai) {
      s = cmd(s, {
        type: "preparation.authorize",
        contentId: c.id,
        expectedRevision: c.revision,
        maxCents: 50,
      });
      c = s.contents[0];
      const request = generationInput(s, actor, {
        contentId: c.id,
        kind: "text",
        expectedRevision: c.revision,
        idempotencyKey: "first-writing",
      });
      if ("adapt" in sample)
        assert.ok(JSON.parse(request.prompt).newsletterSource);
      if (researchJobIds.length)
        assert.equal(
          JSON.parse(request.prompt).webEvidence[0].jobId,
          "local-research",
        );
      const priced = quote(s, request);
      s = applyCommand(s, actor, request, {
        now,
        canonicalGeneration: true,
        quotedCost: priced.cost,
        pricingSnapshot: priced.pricingSnapshot,
      });
      const job = s.jobs[0];
      assert.equal(job.state, "queued");
      assert.equal(canDispatchJob(s, actor, job), true);
      const question = "question" in sample && sample.question;
      const output = await mockProvider(job, s, {
        body: question ? body + " [Ryan to confirm: personal example]" : body,
        metadata: "",
        sources: [],
        questions: question ? ["Which real example supports this?"] : [],
      });
      job.state = "succeeded";
      job.result = output.text;
      job.actual = job.reserved;
      job.reserved = 0;
      settleWrittenOutput(s, job, output, now);
      c = s.contents[0];
      assert.equal(job.outputStatus, "applied");
      if (question) {
        assert.ok(copyBlockers(c).length);
        assert.throws(
          () => cmd(s, { type: "content.submit", id: c.id }),
          /Needs your input/,
        );
        s = cmd(s, {
          type: "content.save",
          id: c.id,
          expectedRevision: c.revision,
          title: c.title,
          text: body,
          metadata: "",
          media: c.media,
        });
      }
    } else {
      s = cmd(s, {
        type: "content.save",
        id: c.id,
        expectedRevision: c.revision,
        title: c.title,
        text: body,
        metadata: "",
        media: c.media,
      });
      assert.equal(s.jobs.length, 0);
    }
    c = s.contents[0];
    s = cmd(s, { type: "content.submit", id: c.id });
    const workflow = s.workflows.find(
      (w) => w.channel === channel && w.status === "active",
    )!;
    s = cmd(s, {
      type: "content.acceptCopy",
      contentId: c.id,
      expectedRevision: c.revision,
      expectedWorkflowId: workflow.id,
      expectedRuleVersion: s.settings.protectedVersion,
      expectedPolicyVersion: s.settings.reviewPolicy!.version,
      evidence:
        "Synthetic test actor checked this local fixture; no actual founder approval.",
    });
    c = s.contents[0];
    s = cmd(s, {
      type: "package.approve",
      contentId: c.id,
      expectedRevision: c.revision,
      expectedWorkflowId: workflow.id,
      expectedRuleVersion: s.settings.protectedVersion,
      expectedPolicyVersion: s.settings.reviewPolicy!.version,
      expectedCopyAcceptanceId: currentCopyAcceptance(c, s)!.id,
      handoff: true,
    });
    const pkg = s.packages[0];
    assert.equal(pkg.text, body);
    if (researchJobIds.length)
      assert.equal(
        pkg.researchSnapshots?.[0].raw,
        s.jobs.find((j) => j.id === "local-research")!.result,
      );
    s = cmd(s, {
      type: "schedule.create",
      contentId: c.id,
      packageId: pkg.id,
      at: "2026-11-04T15:00:00Z",
    });
    const schedule = s.schedules[0];
    assert.equal(schedule.packageId, pkg.id);
    assert.notEqual(schedule.state, "published");
    assert.equal(schedule.publicationUrl, undefined);
    const restored = JSON.parse(JSON.stringify(s)) as StudioState;
    assert.equal(restored.packages[0].text, body);
    assert.ok(
      restored.contents[0].stages?.some(
        (stage) => stage.key === "handoff" && stage.status === "pass",
      ),
    );
    assert.ok(
      s.jobs.reduce((sum, j) => sum + (j.actual ?? j.reserved), 0) <= 50,
    );
    if (!sample.ai) assert.equal(s.jobs.length, 0);
  });
