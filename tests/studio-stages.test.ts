import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { currentWorkflow, stageSummary } from "../lib/studio/stages";
import { completeChecks } from "./stage-fixture";
import { parseGeneratedIdeas } from "../lib/studio/idea-generation";
const ctx = { demo: true };
function fixture() {
  const s = initialState(DEMO_ACTOR, true);
  s.contents[0].text = "A useful handoff explains account access and recovery.";
  return s;
}
function decision(s: ReturnType<typeof fixture>, extra = {}) {
  const d = s.contents[0];
  return {
    type: "stage.decide",
    contentId: d.id,
    stage: "intake",
    status: "pass",
    reason: "Human inspected this exact version.",
    evidence: "Human reviewed sources and current content.",
    expectedRevision: d.revision,
    expectedWorkflowId: currentWorkflow(d, s)?.id,
    expectedRuleVersion: s.settings.protectedVersion,
    ...extra,
  };
}
function approval(s: ReturnType<typeof fixture>) {
  const d = s.contents[0];
  return {
    type: "package.approve",
    contentId: d.id,
    expectedRevision: d.revision,
    expectedWorkflowId: currentWorkflow(d, s)?.id,
    expectedRuleVersion: s.settings.protectedVersion,
  };
}
test("approval cannot skip required stages; held checks reopen downstream stages", () => {
  let s = fixture();
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, approval(s), ctx),
    /six pre-approval/,
  );
  s = completeChecks(s, DEMO_ACTOR, s.contents[0].id, ctx);
  assert.equal(stageSummary(s.contents[0], s).readyForApproval, true);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    decision(s, { stage: "evidence", status: "hold" }),
    ctx,
  );
  assert.equal(stageSummary(s.contents[0], s).readyForApproval, false);
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, approval(s), ctx),
    /six pre-approval/,
  );
});
test("stage provenance is server-derived and rejects stale draft, workflow and rules", () => {
  const s = fixture();
  for (const extra of [
    { expectedRevision: 999 },
    { expectedWorkflowId: "old" },
    { expectedRuleVersion: "old" },
  ])
    assert.throws(
      () => applyCommand(s, DEMO_ACTOR, decision(s, extra), ctx),
      /changed/,
    );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        decision(s, { actor: "fake@example.com" }),
        ctx,
      ),
    /Invalid|Unrecognized/i,
  );
  const next = applyCommand(s, DEMO_ACTOR, decision(s), ctx);
  assert.equal(next.contents[0].stages?.[0].actor, DEMO_ACTOR.email);
});
test("missing video assets do not permit visual N/A and viewers cannot attest", () => {
  const s = fixture();
  s.contents[0].format = "Short video";
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        decision(s, { stage: "visual_review", status: "na" }),
        ctx,
      ),
    /genuinely text-only/,
  );
  const viewer = { id: "viewer", email: "viewer@example.com" };
  s.members.push({ ...viewer, roles: ["viewer"], grants: [], revoked: false });
  assert.throws(
    () => applyCommand(s, viewer, decision(s), ctx),
    /permission|allowed|authorized|access/i,
  );
});
test("copy edits preserve visual checks, reopen evidence, and keep immutable package snapshot", () => {
  let s = fixture();
  s = completeChecks(s, DEMO_ACTOR, s.contents[0].id, ctx);
  s = applyCommand(s, DEMO_ACTOR, approval(s), ctx);
  const snapshot = JSON.stringify(s.packages[0]);
  const d = s.contents[0];
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "content.save",
      id: d.id,
      expectedRevision: d.revision,
      title: d.title,
      text: d.text + " Include recovery contacts.",
      metadata: d.metadata,
      media: d.media,
      format: d.format,
    },
    ctx,
  );
  const summary = stageSummary(s.contents[0], s);
  assert.equal(
    summary.stages.find((x) => x.key === "visual_review")?.status,
    "pass",
  );
  assert.equal(
    summary.stages.find((x) => x.key === "evidence")?.status,
    "pending",
  );
  assert.equal(JSON.stringify(s.packages[0]), snapshot);
});
test("demo idea generation is pending, labelled and idempotent; imported preset stays draft", () => {
  const s = fixture();
  const command = {
    type: "idea.generate",
    channel: "LinkedIn",
    topic: "Documented recovery routines",
    audience: "Family caregivers",
    quantity: 3,
    research: false,
    sourceText: "Provided source notes",
    idempotencyKey: "sample-ideas",
  };
  let next = applyCommand(s, DEMO_ACTOR, command, ctx);
  const ideas = next.ideas.filter((i) => i.origin === "demo_sample");
  assert.equal(ideas.length, 3);
  assert.ok(ideas.every((i) => i.state === "pending"));
  next = applyCommand(next, DEMO_ACTOR, command, ctx);
  assert.equal(next.ideas.filter((i) => i.origin === "demo_sample").length, 3);
  const active = next.workflows.find(
    (w) => w.channel === "LinkedIn" && w.status === "active",
  )?.id;
  next = applyCommand(
    next,
    DEMO_ACTOR,
    { type: "workflow.importPreset", channel: "LinkedIn" },
    ctx,
  );
  assert.equal(next.workflows[0].status, "draft");
  assert.equal(
    next.workflows.find(
      (w) => w.channel === "LinkedIn" && w.status === "active",
    )?.id,
    active,
  );
});
test("malformed idea sets are rejected without importing partial results", () => {
  assert.throws(
    () => parseGeneratedIdeas('{"ideas":[{"title":"Incomplete"}]}'),
    /no partial/,
  );
});
