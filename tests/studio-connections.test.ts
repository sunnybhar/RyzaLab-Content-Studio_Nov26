import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { quote } from "../lib/studio/pricing";
import type { Job } from "../lib/studio/types";
const ctx = { now: "2026-10-28T17:00:00Z" };
function fixture() {
  const s = initialState(DEMO_ACTOR, true);
  s.connections.push({
    id: "target",
    title: "Test Ideas",
    provider: "anthropic",
    function: "ideas",
    model: "configured-model",
    status: "validated",
    hasKey: true,
    updatedAt: "2026-10-28T12:00:00Z",
  });
  return s;
}
function cmd(type = "connection.disconnect") {
  return { type, id: "target", expectedUpdatedAt: "2026-10-28T12:00:00Z" };
}
function job(state: Job["state"]): Job {
  return {
    id: "job",
    connectionId: "target",
    kind: "ideas",
    channel: "LinkedIn",
    prompt: "test",
    estimate: 10,
    reserved: 10,
    state,
    attempt: 0,
    idempotencyKey: "test",
    createdBy: DEMO_ACTOR.email,
    createdAt: ctx.now,
  };
}
test("disconnect retains workflow references and history while removing usability", () => {
  const s = fixture();
  s.workflows[0].functionConnections = { ideas: "target" };
  s.jobs.push(job("succeeded"));
  const next = applyCommand(s, DEMO_ACTOR, cmd(), ctx);
  assert.equal(next.connections[0].hasKey, false);
  assert.equal(next.connections[0].status, "disconnected");
  assert.deepEqual(next.jobs, s.jobs);
  assert.deepEqual(next.workflows, s.workflows);
  assert.equal(s.connections[0].hasKey, true);
});
test("delete removes unused metadata, but history and all workflow references protect used connections", () => {
  let s = fixture();
  assert.equal(
    applyCommand(s, DEMO_ACTOR, cmd("connection.delete"), ctx).connections
      .length,
    0,
  );
  s = fixture();
  s.workflows[0].functionConnections = { ideas: "target" };
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, cmd("connection.delete"), ctx),
    /history or workflow/,
  );
  s = fixture();
  s.jobs.push(job("cancelled"));
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, cmd("connection.delete"), ctx),
    /history or workflow/,
  );
});
test("lifecycle and allowance updates block dispatchable or uncertain jobs", () => {
  for (const state of [
    "queued",
    "awaiting_confirmation",
    "running",
    "unknown",
  ] as const) {
    const s = fixture();
    s.jobs.push(job(state));
    for (const type of [
      "connection.disconnect",
      "connection.delete",
      "connection.allowance",
    ])
      assert.throws(
        () =>
          applyCommand(
            s,
            DEMO_ACTOR,
            {
              ...cmd(type),
              ...(type === "connection.allowance"
                ? { maxRequestCost: 50 }
                : {}),
            },
            ctx,
          ),
        /Cancel waiting jobs/,
      );
  }
});
test("allowance edits preserve model and secret metadata; stale or unauthorized edits reject", () => {
  const s = fixture();
  const next = applyCommand(
    s,
    DEMO_ACTOR,
    { ...cmd("connection.allowance"), maxRequestCost: 50 },
    ctx,
  );
  assert.equal(
    (
      next.connections[0] as (typeof next.connections)[0] & {
        maxRequestCost: number;
      }
    ).maxRequestCost,
    50,
  );
  assert.equal(next.connections[0].status, "validated");
  assert.equal(next.connections[0].hasKey, true);
  assert.throws(() => applyCommand(next, DEMO_ACTOR, cmd(), ctx), /changed/);
  const actor = { id: "limited", email: "limited@example.com" };
  s.members.push({
    ...actor,
    roles: ["editor"],
    grants: [{ action: "connections.manage", function: "text" }],
    revoked: false,
  });
  assert.throws(() => applyCommand(s, actor, cmd(), ctx), /permission/);
});
test("disconnected or unvalidated credentials cannot quote, enqueue, or reserve old requests", () => {
  const s = fixture();
  s.connections[0].status = "disconnected";
  s.connections[0].hasKey = false;
  assert.throws(
    () =>
      quote(
        s,
        {
          channel: "LinkedIn",
          kind: "ideas",
          connectionId: "target",
          prompt: "hello",
        },
        [],
      ),
    /connected provider/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          type: "job.enqueue",
          kind: "ideas",
          channel: "LinkedIn",
          connectionId: "target",
          prompt: "hello",
          estimate: 10,
          idempotencyKey: "deny",
        },
        ctx,
      ),
    /connected provider/,
  );
  s.jobs.push(job("awaiting_confirmation"));
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, { type: "job.confirm", id: "job" }, ctx),
    /connected provider/,
  );
});
