import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { operationsSummary } from "../lib/studio/operations";
import { maintenance } from "../lib/studio/maintenance";
import type { Job } from "../lib/studio/types";
test("operations flags uncertain/expired/stalled jobs and distinguishes unreconciled reservations from actual charges", () => {
  const s = initialState(DEMO_ACTOR, true);
  const base = {
    id: "unknown",
    kind: "ideas",
    channel: "LinkedIn",
    connectionId: "model",
    prompt: "private prompt is not returned in health summary",
    estimate: 10,
    reserved: 10,
    attempt: 1,
    idempotencyKey: "one",
    createdBy: DEMO_ACTOR.email,
    createdAt: "2026-10-28T12:00:00Z",
  } as Job;
  s.jobs = [
    { ...base, state: "unknown" },
    {
      ...base,
      id: "expired",
      state: "running",
      leaseUntil: "2026-10-28T12:02:00Z",
    },
    { ...base, id: "stalled", state: "queued" },
    { ...base, id: "complete", state: "succeeded" },
  ];
  const result = operationsSummary(s, "2026-10-28T13:00:00Z");
  assert.equal(result.openAlerts, 3);
  assert.equal(result.unreconciled, 1);
  assert.equal(result.workerHeartbeat, "not_tracked");
  assert.ok(!JSON.stringify(result).includes(base.prompt));
});
test("job incident notices are idempotent and do not dispatch or duplicate paid requests", () => {
  let s = initialState(DEMO_ACTOR, true);
  s.jobs.push({
    id: "failed-job",
    kind: "text",
    channel: "LinkedIn",
    connectionId: "old-model",
    prompt: "failed request",
    estimate: 10,
    reserved: 10,
    state: "unknown",
    attempt: 1,
    idempotencyKey: "unknown-once",
    createdBy: DEMO_ACTOR.email,
    createdAt: "2026-10-28T12:00:00Z",
  });
  s = maintenance(s, "2026-10-28T13:00:00Z");
  assert.equal(
    s.notices.filter((n) => n.eventId.startsWith("job-alert:")).length,
    1,
  );
  s = maintenance(s, "2026-10-28T13:01:00Z");
  assert.equal(
    s.notices.filter((n) => n.eventId.startsWith("job-alert:")).length,
    1,
  );
  assert.equal(s.jobs.length, 1);
  assert.equal(s.jobs[0].reserved, 10);
});
