import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { copyIdentity, packageReadiness } from "../lib/studio/solo-quality";
import { orchestrateReviews } from "../lib/studio/review-orchestration";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import type { StudioState, Job } from "../lib/studio/types";
const now = "2026-11-03T14:00:00Z",
  ctx = { demo: true, now };
function fixture(autoReview = true) {
  let s = initialState(DEMO_ACTOR, true);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "policy.adoptSolo",
      expectedRuleVersion: s.settings.protectedVersion,
      packageCap: 50,
      monthlyCap: 500,
      requireIndependentReview: false,
      autoDraft: false,
      autoReview,
    },
    ctx,
  );
  const c = s.contents[0];
  c.text = "A household handoff can document routines and useful contacts.";
  c.metadata = "";
  c.media = structuredClone(EMPTY_MEDIA);
  c.format = "Text post";
  s.connections.push({
    id: "simple-reviewer",
    title: "Reviewer",
    provider: "anthropic",
    model: "review-test",
    function: "review",
    hasKey: true,
    status: "validated",
    updatedAt: now,
    ...{ maxRequestCost: 50 },
  });
  s.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  )!.functionConnections = { review: "simple-reviewer" };
  s.settings.qualifiedRates = [
    {
      provider: "anthropic",
      model: "review-test",
      function: "review",
      currency: "USD",
      inputCentsPerMillion: 100,
      outputCentsPerMillion: 500,
      maxInputBytes: 500000,
      maxOutputTokens: 1000,
      source: "https://example.com/prices",
      verifiedAt: "2026-11-02",
      qualified: true,
    },
  ];
  return s;
}
function approve(s: StudioState, overrideReason?: string) {
  const c = s.contents[0];
  return {
    type: "package.approve",
    contentId: c.id,
    expectedRevision: c.revision,
    expectedWorkflowId: s.workflows.find(
      (w) => w.channel === c.channel && w.status === "active",
    )!.id,
    expectedRuleVersion: s.settings.protectedVersion,
    expectedPolicyVersion: s.settings.reviewPolicy!.version,
    singleReview: true,
    handoff: true,
    ...(overrideReason ? { overrideReason } : {}),
  };
}
test("submission queues automatic review without any human copy acceptance or separate allowance form", () => {
  let s = fixture();
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "content.submit", id: s.contents[0].id },
    ctx,
  );
  assert.equal(s.contents[0].copyAcceptances?.length || 0, 0);
  assert.ok(s.contents[0].reviewSubmission);
  assert.equal(s.preparations?.at(-1)?.maxCents, 50);
  s = orchestrateReviews(s, now);
  assert.equal(s.jobs.length, 1);
  assert.equal(s.jobs[0].state, "queued");
  assert.equal(s.jobs[0].targetAccepted, false);
  assert.equal(orchestrateReviews(s, now), s);
  const job = s.jobs[0];
  job.state = "succeeded";
  job.actual = job.reserved;
  job.reserved = 0;
  settleWrittenOutput(
    s,
    job,
    {
      completion: "complete",
      text: JSON.stringify({
        summary: "Provided references reviewed.",
        issues: [],
      }),
    },
    now,
    () => crypto.randomUUID(),
  );
  assert.ok(s.contents[0].agentReview);
  assert.equal(packageReadiness(s.contents[0], s, true).ready, true);
  s = applyCommand(s, DEMO_ACTOR, approve(s), ctx);
  assert.equal(s.packages.length, 1);
  assert.equal(s.packages[0].copyAcceptanceSnapshot, undefined);
  assert.equal(s.packages[0].singleReview, true);
  assert.equal(s.schedules.length, 0);
  assert.equal(applyCommand(s, DEMO_ACTOR, approve(s), ctx).packages.length, 1);
});
test("manual override bypasses uncertain review and findings without falsifying report or billing", () => {
  let s = fixture();
  const c = s.contents[0];
  c.text += " [Ryan to confirm a personal example]";
  s.jobs = [
    {
      id: "old-uncertain",
      contentId: c.id,
      channel: c.channel,
      kind: "review",
      state: "unknown",
      actual: undefined,
      reserved: 14,
      estimate: 14,
      createdBy: DEMO_ACTOR.email,
      createdAt: now,
    } as Job,
  ];
  const before = structuredClone(s.jobs[0]);
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, approve(s), ctx),
    /Resolve blocking/,
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    approve(
      s,
      "Reviewed this draft personally; proceeding despite the unavailable AI report.",
    ),
    ctx,
  );
  assert.deepEqual(s.jobs[0], before);
  assert.equal(s.contents[0].agentReview, undefined);
  assert.ok(
    s.packages[0].editorialOverride?.checks.some((x) =>
      x.includes("pending or uncertain"),
    ),
  );
  assert.ok(
    s.packages[0].editorialOverride?.checks.some((x) => x.includes("Ryan")),
  );
  assert.equal(s.packages[0].editorialOverride?.actor, DEMO_ACTOR.email);
  assert.ok(s.audit.some((x) => x.action === "review.manual_override"));
  assert.equal(s.schedules.length, 0);
});
test("override does not bypass revision, permission, immutable asset or policy identity guards", () => {
  const s = fixture(false),
    command = approve(s, "Personal review is complete.");
  assert.throws(
    () =>
      applyCommand(s, DEMO_ACTOR, { ...command, expectedRevision: 999 }, ctx),
    /content changed/,
  );
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { ...command, expectedPolicyVersion: "old" },
        ctx,
      ),
    /policy changed/,
  );
  const outsider = { id: "outsider", email: "outsider@example.com" };
  assert.throws(() => applyCommand(s, outsider, command, ctx));
  s.contents[0].media.imageUrl = "https://example.com/mutable.jpg";
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, command, ctx),
    /immutable uploaded/,
  );
});
test("automatic submission preserves lower package allowance and counts historical unknown reservations", () => {
  let s = fixture();
  const c = s.contents[0];
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      expectedRevision: c.revision,
      maxCents: 10,
    },
    ctx,
  );
  s = applyCommand(s, DEMO_ACTOR, { type: "content.submit", id: c.id }, ctx);
  assert.equal(
    s.preparations!.find((p) => p.id === s.contents[0].preparationId)!.maxCents,
    10,
  );
  s.jobs.push({
    id: "unknown",
    contentId: c.id,
    channel: c.channel,
    kind: "review",
    state: "unknown",
    reserved: 10,
    estimate: 10,
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
  } as Job);
  const next = orchestrateReviews(s, now);
  assert.equal(next.jobs.length, 1);
  assert.equal(next.jobs[0].reserved, 10);
  assert.match(next.contents[0].automaticReview!.error!, /uncertain/);
});
