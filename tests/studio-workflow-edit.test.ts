import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
function edit(
  state: ReturnType<typeof initialState>,
  id: string,
  instructions: string,
  expectedUpdatedAt?: string,
) {
  const w = state.workflows.find((w) => w.id === id)!;
  return {
    type: "workflow.save",
    id,
    expectedUpdatedAt: expectedUpdatedAt || w.updatedAt || w.createdAt,
    channel: w.channel,
    title: w.title,
    audience: w.audience,
    instructions,
    guardrails: w.guardrails,
    references: w.references,
    examples: w.examples,
    outputFormat: w.outputFormat,
    checks: w.checks,
    connectionId: w.connectionId,
    functionConnections: w.functionConnections,
  };
}
test("draft edits retain ID/version/creation date and update timestamp without accumulating revisions", () => {
  const initial = initialState(DEMO_ACTOR, true);
  const active = initial.workflows[0];
  let s = applyCommand(
    initial,
    DEMO_ACTOR,
    edit(initial, active.id, "First pending change"),
    { now: "2026-10-29T11:00:00Z" },
  );
  const draft = s.workflows[0];
  const count = s.workflows.length;
  s = applyCommand(
    s,
    DEMO_ACTOR,
    edit(s, draft.id, "Edited pending change", draft.updatedAt),
    { now: "2026-10-29T11:05:00Z" },
  );
  assert.equal(s.workflows.length, count);
  assert.equal(s.workflows[0].id, draft.id);
  assert.equal(s.workflows[0].version, draft.version);
  assert.equal(s.workflows[0].createdAt, draft.createdAt);
  assert.equal(s.workflows[0].updatedAt, "2026-10-29T11:05:00.000Z");
  assert.equal(s.workflows[0].instructions, "Edited pending change");
  assert.deepEqual(
    s.workflows.find((w) => w.id === active.id),
    active,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        edit(s, draft.id, "Stale overwrite", draft.updatedAt),
      ),
    /changed while editing/,
  );
});
test("editing an active revision preserves active inputs and job/package snapshots pending explicit activation", () => {
  const initial = initialState(DEMO_ACTOR, true);
  const active = initial.workflows[0];
  const packages = structuredClone(initial.packages),
    jobs = structuredClone(initial.jobs);
  let s = applyCommand(
    initial,
    DEMO_ACTOR,
    edit(initial, active.id, "New reviewed instructions"),
  );
  assert.equal(s.workflows[0].status, "draft");
  assert.notEqual(s.workflows[0].id, active.id);
  assert.deepEqual(
    s.workflows.find((w) => w.id === active.id),
    active,
  );
  assert.deepEqual(s.packages, packages);
  assert.deepEqual(s.jobs, jobs);
  const draftId = s.workflows[0].id;
  s = applyCommand(s, DEMO_ACTOR, { type: "workflow.submit", id: draftId });
  s = applyCommand(s, DEMO_ACTOR, { type: "workflow.activate", id: draftId });
  assert.equal(
    s.workflows.filter(
      (w) => w.channel === active.channel && w.status === "active",
    ).length,
    1,
  );
  assert.equal(s.workflows.find((w) => w.id === draftId)?.status, "active");
  assert.equal(
    s.workflows.find((w) => w.id === active.id)?.instructions,
    active.instructions,
  );
});
test("workflow edits enforce channel ownership and current editing permission", () => {
  const initial = initialState(DEMO_ACTOR, true);
  const w = initial.workflows[0];
  assert.throws(
    () =>
      applyCommand(initial, DEMO_ACTOR, {
        ...edit(initial, w.id, "Cross-channel"),
        channel: "Reddit",
      }),
    /existing workflow/,
  );
  const viewer = { id: "viewer", email: "viewer@example.com" };
  initial.members.push({
    ...viewer,
    roles: ["viewer"],
    grants: [],
    revoked: false,
  });
  assert.throws(
    () => applyCommand(initial, viewer, edit(initial, w.id, "Unauthorized")),
    /permission/,
  );
});

test("draft edits require a token and strictly advance it even for same-millisecond saves", () => {
  const initial = initialState(DEMO_ACTOR, true);
  const active = initial.workflows[0];
  const stamp = active.createdAt;
  let s = applyCommand(
    initial,
    DEMO_ACTOR,
    edit(initial, active.id, "Pending"),
    { now: stamp },
  );
  const d = s.workflows[0];
  const command = edit(s, d.id, "First same-ms edit");
  assert.throws(
    () =>
      applyCommand(s, DEMO_ACTOR, { ...command, expectedUpdatedAt: undefined }),
    /timestamp is required/,
  );
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, { ...command, expectedUpdatedAt: "" }),
    /Invalid command/,
  );
  s = applyCommand(s, DEMO_ACTOR, command, { now: stamp });
  assert.ok(Date.parse(s.workflows[0].updatedAt!) > Date.parse(stamp));
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, command, { now: stamp }),
    /changed while editing/,
  );
});
