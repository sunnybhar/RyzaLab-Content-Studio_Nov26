import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { filteredState } from "../lib/studio/permissions";
import { frozenSystem } from "../lib/studio/pricing";
import { ideaJobInput } from "../lib/studio/idea-generation";
const marker = "PRIVATE_ORIGINAL_VOICE_EXAMPLE_NOT_LINKED",
  now = "2026-11-03T01:00:00Z";
const pasted = {
  type: "agentVoice.create",
  title: "Original post",
  contentType: "post",
  channel: "Shared",
  text: marker,
  requestKey: "voice-1",
};
test("many pasted/file examples retain original text/bytes and remain disconnected", () => {
  const original = initialState(DEMO_ACTOR, true);
  let next = applyCommand(original, DEMO_ACTOR, pasted, { now });
  next = applyCommand(
    next,
    DEMO_ACTOR,
    {
      type: "agentVoice.create",
      title: "Original newsletter",
      contentType: "newsletter",
      channel: "Newsletter",
      file: {
        fileName: "newsletter.docx",
        base64: btoa(marker),
        byteSize: marker.length,
      },
      requestKey: "voice-2",
    },
    { now },
  );
  assert.equal(next.agentVoiceExamples?.length, 2);
  assert.equal(atob(next.agentVoiceExamples![0].file!.base64), marker);
  assert.deepEqual(next.workflows, original.workflows);
  assert.deepEqual(next.references, original.references);
  assert.deepEqual(next.jobs, original.jobs);
  assert.deepEqual(next.settings, original.settings);
  const system = frozenSystem({
    workflowSnapshot: next.workflows[0],
    rulesSnapshot: next.settings.protectedRules,
  });
  assert.ok(!system.includes(marker));
  next.settings.defaultConnections = { ideas: "writing" };
  for (const w of next.workflows) w.functionConnections = {};
  assert.ok(
    !ideaJobInput(next, DEMO_ACTOR, {
      channel: "LinkedIn",
      topic: "Household controls",
      audience: "Households",
      quantity: 1,
      research: false,
      sourceText: "",
      idempotencyKey: "without-voice",
    }).prompt.includes(marker),
  );
});
test("voice uploads are idempotent and reject conflicting/empty content", () => {
  const s = applyCommand(initialState(DEMO_ACTOR, true), DEMO_ACTOR, pasted, {
    now,
  });
  assert.equal(applyCommand(s, DEMO_ACTOR, pasted, { now }), s);
  const stored = JSON.parse(
    JSON.stringify(s, (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
          )
        : value,
    ),
  );
  assert.equal(
    applyCommand(stored, DEMO_ACTOR, pasted, { now }),
    stored,
    "JSONB key ordering must not break same-request replay",
  );

  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...pasted, title: "Changed title" },
        { now },
      ),
    /different example/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...pasted, text: "", requestKey: "empty" },
        { now },
      ),
    /pasted text/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          ...pasted,
          file: {
            fileName: "file.pdf",
            base64: btoa(marker),
            byteSize: marker.length,
          },
          requestKey: "both",
        },
        { now },
      ),
    /pasted text/,
  );
});
test("scoped users cannot read/remove brand-wide or other-channel original examples", () => {
  let s = applyCommand(initialState(DEMO_ACTOR, true), DEMO_ACTOR, pasted, {
    now,
  });
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { ...pasted, channel: "LinkedIn", requestKey: "linkedin" },
    { now },
  );
  s.members.push({
    id: "scoped",
    email: "scoped@example.com",
    roles: ["editor"],
    grants: [{ action: "workflow.edit", channel: "LinkedIn" }],
    revoked: false,
  });
  const actor = { id: "scoped", email: "scoped@example.com" },
    visible = filteredState(s, actor);
  assert.deepEqual(
    visible.agentVoiceExamples?.map((e) => e.channel),
    ["LinkedIn"],
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        actor,
        {
          type: "agentVoice.remove",
          id: s.agentVoiceExamples!.find((e) => e.channel === "Shared")!.id,
        },
        { now },
      ),
    /permission/,
  );
  const own = visible.agentVoiceExamples![0];
  const next = applyCommand(
    s,
    actor,
    { type: "agentVoice.remove", id: own.id },
    { now },
  );
  assert.equal(next.agentVoiceExamples?.length, 1);
});
