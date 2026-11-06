import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { generationInput } from "../lib/studio/generation";
import {
  blockingUnknownJobs,
  hasWritingFollowup,
} from "../lib/studio/writing-followup";
import { preparationSpend } from "../lib/studio/preparation-budget";
import type { Job } from "../lib/studio/types";
const now = "2026-11-06T19:52:18Z",
  ctx = { now, demo: true, canonicalGeneration: true };
function fixture(cap = 50) {
  let s = initialState(DEMO_ACTOR, true);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "policy.adoptSolo",
      expectedRuleVersion: s.settings.protectedVersion,
      packageCap: 50,
      monthlyCap: 500,
      autoDraft: false,
      autoReview: false,
      requireIndependentReview: false,
    },
    ctx,
  );
  const c = s.contents[0];
  c.text = "";
  c.media = structuredClone(EMPTY_MEDIA);
  c.format = "Text post";
  s.connections.push({
    id: "writer",
    title: "Writer",
    provider: "anthropic",
    model: "fixture",
    function: "text",
    hasKey: true,
    status: "validated",
    updatedAt: now,
    ...{ maxRequestCost: 14 },
  });
  s.workflows.find((w) => w.channel === c.channel)!.connectionId = "writer";
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      expectedRevision: c.revision,
      maxCents: cap,
    },
    ctx,
  );
  s.jobs = [
    {
      id: "old-unknown",
      kind: "text",
      contentId: c.id,
      channel: c.channel,
      state: "unknown",
      createdBy: DEMO_ACTOR.email,
      createdAt: now,
      reserved: 14,
      estimate: 14,
      attempt: 1,
      connectionId: "writer",
      prompt: "original",
      idempotencyKey: "old",
      outputContract: "draft_v1",
    } as Job,
  ];
  return s;
}
function command(
  s: ReturnType<typeof fixture>,
  ids?: string[],
  key = "explicit-new",
) {
  return generationInput(s, DEMO_ACTOR, {
    contentId: s.contents[0].id,
    expectedRevision: s.contents[0].revision,
    kind: "text",
    idempotencyKey: key,
    ...(ids ? { acknowledgeUnknownJobIds: ids } : {}),
  });
}
test("explicit new writing retains the unknown attempt/reservation and counts both under one cap", () => {
  const s = fixture(),
    old = structuredClone(s.jobs[0]);
  assert.throws(() => command(s), /uncertain/);
  let next = applyCommand(s, DEMO_ACTOR, command(s, [old.id]), ctx);
  assert.equal(next.jobs.length, 2);
  assert.equal(next.jobs[0].state, "queued");
  assert.equal(next.jobs[0].reserved, 14);
  assert.equal(next.jobs[1].state, "unknown");
  assert.equal(next.jobs[1].reserved, 14);
  assert.equal(next.jobs[1].actual, undefined);
  assert.equal(next.jobs[1].writingFollowupId, next.jobs[0].id);
  assert.equal(preparationSpend(next, next.contents[0].preparationId!), 28);
  assert.equal(blockingUnknownJobs(next, next.contents[0].id).length, 0);
  assert.ok(hasWritingFollowup(next, next.jobs[1]));
  assert.throws(() => command(next, [old.id]), /changed|active/);
  next.jobs[0].state = "cancelled";
  next.jobs[0].reserved = 0;
  assert.equal(blockingUnknownJobs(next, next.contents[0].id).length, 1);
});
test("unknown reservations cannot be erased to squeeze a new attempt through the cap", () => {
  const s = fixture(20),
    before = structuredClone(s);
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, command(s, ["old-unknown"]), ctx),
    /budget|cap|allowance/i,
  );
  assert.deepEqual(s, before);
});
test("follow-up IDs are exact and cannot acknowledge unrelated jobs, reviews or active work", () => {
  const s = fixture();
  for (const ids of [["other"], ["old-unknown", "old-unknown"]])
    assert.throws(() => command(s, ids), /changed/);
  s.jobs[0].kind = "review";
  assert.throws(() => command(s, ["old-unknown"]), /changed/);
  s.jobs[0].kind = "text";
  const input = command(s, ["old-unknown"]);
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, input, { demo: true, now }),
    /canonical/,
  );
});
