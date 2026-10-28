import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { filteredState } from "../lib/studio/permissions";
import { studioAnalytics } from "../lib/studio/analytics";
import { maintenance } from "../lib/studio/maintenance";
const ctx = { demo: true, now: "2026-10-28T12:00:00Z" };
function create(s = initialState(DEMO_ACTOR, true), extra = {}) {
  return applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "task.create",
      title: "Edit content carefully",
      kind: "editing",
      contentId: s.contents[0].id,
      channel: "LinkedIn",
      at: "2026-11-05T14:00:00Z",
      notes: "Check sources",
      ...extra,
    },
    ctx,
  );
}
test("planning work does not approve, generate or publish and supports move and completion", () => {
  let s = create();
  assert.equal(s.planningTasks?.length, 1);
  assert.equal(s.packages.length, 0);
  assert.equal(s.jobs.length, 0);
  assert.equal(s.schedules.length, 0);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "task.update",
      id: s.planningTasks![0].id,
      at: "2026-11-06T14:00:00Z",
    },
    ctx,
  );
  assert.equal(s.planningTasks![0].at, "2026-11-06T14:00:00Z");
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "task.update", id: s.planningTasks![0].id, state: "done" },
    ctx,
  );
  assert.equal(s.planningTasks![0].state, "done");
});
test("planning rejects invalid target, past time and unauthorized edits", () => {
  assert.throws(
    () => create(undefined, { at: "2026-10-01T12:00:00Z" }),
    /future/,
  );
  assert.throws(
    () => create(undefined, { channel: "Reddit" }),
    /matching channel/,
  );
  assert.throws(
    () =>
      create(undefined, {
        kind: "workflow",
        contentId: undefined,
        workflowId: "missing",
      }),
    /existing workflow/,
  );
  const s = create(),
    viewer = { id: "v", email: "viewer@example.com" };
  s.members.push({ ...viewer, roles: ["viewer"], grants: [], revoked: false });
  assert.throws(
    () =>
      applyCommand(
        s,
        viewer,
        { type: "task.update", id: s.planningTasks![0].id, state: "done" },
        ctx,
      ),
    /permission/,
  );
  assert.equal(filteredState(s, viewer).planningTasks?.length, 0);
});
test("planning protects active drafts from Trash, and due reminders are idempotent", () => {
  let s = create();
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { type: "content.trash", id: s.contents[0].id },
        ctx,
      ),
    /planning tasks/,
  );
  s = maintenance(s, "2026-11-07T00:00:00Z");
  const count = s.notices.filter((n) =>
    n.eventId.startsWith("planning-due:"),
  ).length;
  assert.equal(count, 1);
  s = maintenance(s, "2026-11-07T01:00:00Z");
  assert.equal(
    s.notices.filter((n) => n.eventId.startsWith("planning-due:")).length,
    1,
  );
  assert.equal(s.jobs.length, 0);
});
test("workflow planning links an actual workflow without running it", () => {
  const s = initialState(DEMO_ACTOR, true);
  const next = create(s, {
    kind: "workflow",
    contentId: undefined,
    workflowId: "seed-linkedin",
  });
  assert.equal(next.planningTasks![0].workflowId, "seed-linkedin");
  assert.equal(next.workflows.length, s.workflows.length);
});
test("analytics counts human confirmations, excludes trash and separates reservations from actual cost", () => {
  const s = create();
  s.schedules.push({
    id: "confirmed",
    contentId: s.contents[0].id,
    at: "2026-10-28T13:00:00Z",
    owner: DEMO_ACTOR.email,
    state: "published",
    confirmedAt: "2026-10-28T13:00:00Z",
    verification: "human_confirmed",
    publicationUrl: "https://linkedin.com/posts/example",
  });
  s.schedules.push({ ...s.schedules[0], id: "second-confirmation" });
  const a = studioAnalytics(
    s,
    "All channels",
    7,
    new Date("2026-10-28T14:00:00Z"),
  );
  assert.equal(a.contents, 1);
  assert.equal(a.published, 1);
  assert.equal(a.periodPublications, 2);
  assert.equal(a.taskCount, 1);
  assert.equal(a.actualCost, 0);
  assert.equal(studioAnalytics(s, "Reddit", 7).contents, 0);
  s.contents[0].deletedAt = "2026-10-28T14:00:00Z";
  assert.equal(studioAnalytics(s, "All channels", 7).contents, 0);
});
