import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { filteredState } from "../lib/studio/permissions";
import { ideaJobInput } from "../lib/studio/idea-generation";
import { generationInput } from "../lib/studio/generation";
import { frozenSystem } from "../lib/studio/pricing";
const now = "2026-11-03T01:00:00Z",
  marker = "PRIVATE_AGENT_RULES_MUST_NOT_ENTER_PROMPTS",
  encoded = btoa(marker);
const command = (channel = "LinkedIn", slot = "instructions") => ({
  type: "agentRules.save",
  channel,
  slot,
  fileName: `${slot}.txt`,
  base64: encoded,
  byteSize: marker.length,
});
test("two separate original files per channel are stored without altering active workflows, references or jobs", () => {
  const original = initialState(DEMO_ACTOR, true);
  let next = applyCommand(original, DEMO_ACTOR, command(), { now });
  next = applyCommand(next, DEMO_ACTOR, command("LinkedIn", "context"), {
    now,
  });
  assert.equal(next.agentRuleFiles?.length, 2);
  assert.equal(atob(next.agentRuleFiles![0].base64), marker);
  assert.deepEqual(next.workflows, original.workflows);
  assert.deepEqual(next.references, original.references);
  assert.deepEqual(next.jobs, original.jobs);
  assert.deepEqual(next.settings, original.settings);
  assert.throws(
    () => applyCommand(next, DEMO_ACTOR, command(), { now }),
    /file changed/,
  );
  const file = next.agentRuleFiles![0];
  next = applyCommand(
    next,
    DEMO_ACTOR,
    {
      type: "agentRules.remove",
      channel: file.channel,
      slot: file.slot,
      expectedId: file.id,
    },
    { now },
  );
  assert.equal(next.agentRuleFiles?.length, 1);
});
test("Agent Rules remain absent from idea/writing prompts and frozen system context", () => {
  let s = applyCommand(initialState(DEMO_ACTOR, true), DEMO_ACTOR, command(), {
    now,
  });
  s.settings.defaultConnections = { ideas: "writing", text: "writing" };
  for (const w of s.workflows) {
    w.functionConnections = {};
    w.connectionId = "";
  }
  const ideas = ideaJobInput(s, DEMO_ACTOR, {
    channel: "LinkedIn",
    topic: "Household controls",
    audience: "Households",
    quantity: 1,
    research: false,
    sourceText: "",
    idempotencyKey: "no-agent-rules",
  });
  const draft = s.contents.find((c) => c.channel === "LinkedIn")!;
  const writing = generationInput(s, DEMO_ACTOR, {
    contentId: draft.id,
    expectedRevision: draft.revision,
    kind: "text",
    idempotencyKey: "no-rule-writing",
  });
  const system = frozenSystem({
    workflowSnapshot: s.workflows[0],
    rulesSnapshot: s.settings.protectedRules,
  });
  for (const value of [ideas.prompt, writing.prompt, system]) {
    assert.ok(!value.includes(marker));
    assert.ok(!value.includes(encoded));
  }
});
test("file limits, stale replacements and channel permissions are enforced", () => {
  let s = initialState(DEMO_ACTOR, true);
  s = applyCommand(s, DEMO_ACTOR, command(), { now });
  s = applyCommand(s, DEMO_ACTOR, command("Newsletter"), { now });
  s.members.push({
    id: "limited",
    email: "limited@example.com",
    roles: ["creator"],
    grants: [{ action: "workflow.edit", channel: "LinkedIn" }],
    revoked: false,
  });
  const limited = { id: "limited", email: "limited@example.com" };
  assert.deepEqual(
    filteredState(s, limited).agentRuleFiles?.map((f) => f.channel),
    ["LinkedIn"],
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        limited,
        {
          ...command("Newsletter"),
          expectedId: s.agentRuleFiles?.find((f) => f.channel === "Newsletter")
            ?.id,
        },
        { now },
      ),
    /permission/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...command("Reddit"), byteSize: 1 },
        { now },
      ),
    /nonempty file/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...command("Reddit"), fileName: "rules.html" },
        { now },
      ),
    /Invalid command/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...command("Reddit"), fileName: "..\/rules.txt" },
        { now },
      ),
    /Invalid command/,
  );
});
