import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { orchestrateReviews } from "../lib/studio/review-orchestration";
import { packageReadiness } from "../lib/studio/solo-quality";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
const now = "2026-10-29T14:00:00Z";
function fixture() {
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
      autoDraft: true,
      autoReview: true,
    },
    { now, demo: true },
  );
  s.settings.requestCap = 50;
  const c = s.contents[0];
  c.text = "A household handoff can list routines and who to contact.";
  c.metadata = "";
  c.media = structuredClone(EMPTY_MEDIA);
  c.format = "Text post";
  const workflow = s.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  )!;
  s.connections.push({
    id: "review-connection",
    title: "Reviewer",
    provider: "anthropic",
    model: "review-test",
    function: "review",
    hasKey: true,
    status: "validated",
    updatedAt: now,
    ...{ maxRequestCost: 50 },
  });
  workflow.functionConnections = {
    ...workflow.functionConnections,
    review: "review-connection",
  };
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
      verifiedAt: "2026-10-28",
      qualified: true,
    },
  ];
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      expectedRevision: c.revision,
      maxCents: 50,
    },
    { now },
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "content.acceptCopy",
      contentId: c.id,
      expectedRevision: c.revision,
      expectedWorkflowId: workflow.id,
      expectedRuleVersion: s.settings.protectedVersion,
      expectedPolicyVersion: s.settings.reviewPolicy!.version,
      evidence: "Human checked the copy against supplied references.",
    },
    { now },
  );
  return s;
}
test("copy approval durably queues one canonical review within the package budget, without another confirmation", () => {
  const original = fixture();
  const next = orchestrateReviews(original, now);
  assert.equal(original.jobs.length, 0);
  assert.equal(next.jobs.length, 1);
  const job = next.jobs[0];
  assert.equal(job.outputContract, "review_v1");
  assert.equal(job.state, "queued");
  assert.ok(job.reserved > 0);
  assert.ok(job.preparationId);
  assert.equal(job.targetAccepted, true);
  assert.match(job.prompt, /household handoff/);
  assert.equal(orchestrateReviews(next, now), next);
  assert.equal(packageReadiness(next.contents[0], next).ready, false);
  job.state = "succeeded";
  job.actual = job.reserved;
  job.reserved = 0;
  settleWrittenOutput(
    next,
    job,
    {
      completion: "complete",
      text: JSON.stringify({
        summary: "Compared the exact copy against the supplied references.",
        issues: [],
      }),
    },
    now,
  );
  assert.ok(next.contents[0].agentReview);
  assert.equal(next.contents[0].agentReview!.independent, false);
  assert.equal(packageReadiness(next.contents[0], next).ready, true);
  assert.equal(orchestrateReviews(next, now), next);
});
test("missing setup and exhausted budget preserve copy approval and never spend or duplicate failed attempts", () => {
  for (const mutate of [
    (s: ReturnType<typeof fixture>) => {
      s.settings.qualifiedRates = [];
    },
    (s: ReturnType<typeof fixture>) => {
      s.preparations![0].maxCents = 1;
    },
    (s: ReturnType<typeof fixture>) => {
      s.connections.find((c) => c.id === "review-connection")!.status =
        "disconnected";
    },
  ]) {
    const s = fixture();
    mutate(s);
    const next = orchestrateReviews(s, now);
    assert.equal(next.jobs.length, 0);
    assert.ok(next.contents[0].automaticReview?.error);
    assert.equal(next.contents[0].copyAcceptances?.length, 1);
    assert.equal(orchestrateReviews(next, now), next);
  }
  const next = orchestrateReviews(fixture(), now);
  next.jobs[0].state = "unknown";
  const blocked = orchestrateReviews(next, now);
  assert.equal(blocked.jobs.length, 1);
  assert.match(blocked.contents[0].automaticReview!.error!, /uncertain/);
  next.jobs[0].state = "failed";
  assert.equal(orchestrateReviews(next, now).jobs.length, 1);
});
test("changed copy or revoked approver blocks dispatch and report attachment; no legacy policy is auto-adopted", () => {
  const next = orchestrateReviews(fixture(), now);
  const job = next.jobs[0];
  assert.equal(canDispatchJob(next, DEMO_ACTOR, job), true);
  next.contents[0].text = "Changed after the review was queued.";
  assert.equal(canDispatchJob(next, DEMO_ACTOR, job), false);
  assert.equal(orchestrateReviews(next, now), next);
  const revoked = fixture();
  revoked.members[0].revoked = true;
  const blocked = orchestrateReviews(revoked, now);
  assert.equal(blocked.jobs.length, 0);
  assert.match(blocked.contents[0].automaticReview!.error!, /access/);
  const legacy = initialState(DEMO_ACTOR, true);
  assert.equal(orchestrateReviews(legacy, now), legacy);
});
test("required independence never automatically spends on same-provider or unknown-author review", () => {
  for (const provenance of [
    undefined,
    { provider: "anthropic" as const, model: "writer", jobId: "writing" },
  ]) {
    const s = fixture();
    s.settings.reviewPolicy!.requireIndependentReview = true;
    s.contents[0].generatedBy = provenance;
    const next = orchestrateReviews(s, now);
    assert.equal(next.jobs.length, 0);
    assert.match(
      next.contents[0].automaticReview!.error!,
      /independent review/,
    );
  }
});
