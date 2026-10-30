import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { canReadNewsletterSource } from "../lib/studio/newsletter-source";
import { generationInput } from "../lib/studio/generation";
const now = "2026-10-30T12:00:00Z";
test("newsletter adaptation retains source revision, leaves post unchanged and starts no AI work", () => {
  const s = initialState(DEMO_ACTOR, true),
    original = s.contents[0];
  original.channel = "LinkedIn";
  original.text = "A real household routine.";
  const command = {
    type: "content.newsletter",
    sourceKind: "content",
    sourceId: original.id,
    expectedRevision: original.revision,
  };
  const result = applyCommand(s, DEMO_ACTOR, command, { demo: true, now });
  const draft = result.contents[0];
  assert.equal(draft.channel, "Newsletter");
  assert.equal(draft.text, "");
  assert.equal(draft.newsletterSource?.text, original.text);
  assert.equal(draft.newsletterSource?.revision, original.revision);
  assert.deepEqual(
    result.contents.find((c) => c.id === original.id),
    original,
  );
  assert.deepEqual(result.jobs, s.jobs);
  const twice = applyCommand(result, DEMO_ACTOR, command, { demo: true, now });
  assert.equal(twice.contents.length, result.contents.length);
  result.settings.defaultConnections = { text: "fixture-writer" };
  const input = generationInput(result, DEMO_ACTOR, {
    contentId: draft.id,
    kind: "text",
    expectedRevision: 1,
    idempotencyKey: "newsletter-test",
  });
  assert.equal(JSON.parse(input.prompt).newsletterSource.text, original.text);
  result.contents.find((c) => c.id === original.id)!.deletedAt = now;
  assert.equal(canReadNewsletterSource(result, DEMO_ACTOR, draft), false);
  assert.throws(
    () =>
      generationInput(result, DEMO_ACTOR, {
        contentId: draft.id,
        kind: "text",
        expectedRevision: 1,
        idempotencyKey: "blocked",
      }),
    /source/,
  );
});
test("idea can become a manual newsletter without changing approval or starting AI", () => {
  const s = initialState(DEMO_ACTOR, true),
    idea = s.ideas[0];
  idea.state = "pending";
  const result = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "content.newsletter", sourceKind: "idea", sourceId: idea.id },
    { demo: true, now },
  );
  assert.equal(result.contents[0].newsletterSource?.text, idea.brief);
  assert.equal(result.ideas[0].state, "pending");
  assert.deepEqual(result.jobs, s.jobs);
});
test("newsletter rejects stale and deleted content sources", () => {
  const s = initialState(DEMO_ACTOR, true),
    c = s.contents[0];
  c.channel = "Reddit";
  const cmd = {
    type: "content.newsletter",
    sourceKind: "content",
    sourceId: c.id,
    expectedRevision: c.revision + 1,
  };
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, cmd, { demo: true }),
    /current source/,
  );
  c.deletedAt = now;
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...cmd, expectedRevision: c.revision },
        { demo: true },
      ),
    /current source/,
  );
});

test("newsletter adaptation requires both source read access and destination creation permission", () => {
  const s = initialState(DEMO_ACTOR, true),
    c = s.contents[0];
  c.channel = "LinkedIn";
  const member = s.members.find((m) => m.email === DEMO_ACTOR.email)!;
  member.roles = ["creator"];
  member.grants = [
    { action: "content.create", channel: "Newsletter", account: "RyzaLab" },
  ];
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          type: "content.newsletter",
          sourceKind: "content",
          sourceId: c.id,
          expectedRevision: c.revision,
        },
        { demo: true },
      ),
    /permission for read/,
  );
  member.grants = [{ action: "read", channel: "LinkedIn" }];
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          type: "content.newsletter",
          sourceKind: "content",
          sourceId: c.id,
          expectedRevision: c.revision,
        },
        { demo: true },
      ),
    /content.create/,
  );
});
