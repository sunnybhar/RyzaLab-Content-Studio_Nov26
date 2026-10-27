import { test } from "node:test";
import assert from "node:assert/strict";
import { maintenance } from "../lib/studio/maintenance";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
test("due unapproved publication blocks once and never auto-publishes after readiness changes", () => {
  let s = initialState(DEMO_ACTOR, true);
  s.schedules.push({
    id: "task",
    contentId: s.contents[0].id,
    at: "2026-01-01T00:00:00Z",
    owner: DEMO_ACTOR.email,
    state: "planned",
  });
  s = maintenance(s, "2026-10-27T12:00:00Z");
  assert.equal(s.schedules[0].state, "blocked");
  assert.equal(
    s.notices.filter((n) => n.eventId.startsWith("due-blocked")).length,
    1,
  );
  assert.deepEqual(maintenance(s, "2026-10-27T13:00:00Z"), s);
});
test("trash expiry preserves release dependencies and expires unreferenced content only after90 days", () => {
  const s = initialState(DEMO_ACTOR, true);
  s.contents[0].deletedAt = "2026-01-01T00:00:00Z";
  s.schedules.push({
    id: "task",
    contentId: s.contents[0].id,
    at: "2026-11-01T00:00:00Z",
    owner: DEMO_ACTOR.email,
    state: "blocked",
  });
  assert.equal(maintenance(s, "2026-10-27T12:00:00Z").contents.length, 1);
  s.schedules = [];
  assert.equal(maintenance(s, "2026-10-27T12:00:00Z").contents.length, 0);
});
test("unconfirmed recurring occurrence never silently spends and records only one owner event", () => {
  const s = initialState(DEMO_ACTOR, true);
  s.recurrences.push({
    id: "r",
    title: "Weekly ideas",
    channel: "Hub",
    quantity: 5,
    nextAt: "2026-01-01T00:00:00Z",
    research: true,
    state: "active",
  });
  const next = maintenance(s, "2026-10-27T00:00:00Z");
  assert.equal(next.jobs.length, 0);
  assert.equal(next.recurrences[0].state, "paused");
  assert.equal(
    next.notices.filter((n) => n.eventId.startsWith("recurrence:")).length,
    1,
  );
  assert.deepEqual(maintenance(next, "2026-10-28T00:00:00Z"), next);
});
