import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { orchestrateReviewPreparation } from "../lib/studio/review-preparation";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
import type { StudioState, Job } from "../lib/studio/types";
const now = "2026-11-07T13:00:00Z";
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
      autoDraft: false,
      autoReview: true,
      autoCorrect: true,
    },
    { demo: true, now },
  );
  s.jobs = [];
  s.packages = [];
  s.contents = s.contents.slice(0, 1);
  const d = s.contents[0];
  d.state = "draft";
  d.copyAcceptances = [];
  d.agentReview = undefined;
  d.text = "A household handoff can document useful routines and contacts.";
  d.format = "Text post";
  d.metadata = "";
  d.media = structuredClone(EMPTY_MEDIA);
  const w = s.workflows.find(
    (w) => w.channel === d.channel && w.status === "active",
  )!;
  for (const kind of ["text", "review"] as const) {
    s.connections.push({
      id: "qualified-" + kind,
      title: kind,
      provider: "openai",
      model: "qualified-" + kind,
      function: kind,
      hasKey: true,
      status: "validated",
      updatedAt: now,
      maxRequestCost: 50,
    } as any);
    w.functionConnections = {
      ...w.functionConnections,
      [kind]: "qualified-" + kind,
    };
  }
  s.settings.qualifiedRates = (["text", "review"] as const).map((kind) => ({
    provider: "openai",
    model: "qualified-" + kind,
    function: kind,
    currency: "USD",
    fixedCents: 1,
    inputCentsPerMillion: 1,
    outputCentsPerMillion: 1,
    maxInputBytes: 500000,
    maxOutputTokens: 2000,
    source: "https://example.com/pricing",
    verifiedAt: now,
    qualified: true,
  }));
  s.settings.requestCap = 50;
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: d.id,
      expectedRevision: d.revision,
      maxCents: 50,
    },
    { now },
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "content.submit", id: d.id },
    { now },
  );
  return orchestrateReviewPreparation(s, now);
}
function settleReview(s: StudioState, blocked = true) {
  const j = s.jobs.find((j) => j.kind === "review" && j.state === "queued")!;
  assert.ok(j);
  j.state = "succeeded";
  j.actual = 1;
  j.reserved = 0;
  settleWrittenOutput(
    s,
    j,
    {
      completion: "complete",
      text: JSON.stringify({
        summary: blocked
          ? "A supplied passage needs a clearer evidence boundary."
          : "The exact revision has no remaining findings.",
        issues: blocked
          ? [
              {
                severity: "warning",
                message: "Qualify the supplied generalization.",
                referenceIds: [],
              },
            ]
          : [],
      }),
    },
    now,
  );
  return orchestrateReviewPreparation(s, now);
}
function fix(s: StudioState, round: number) {
  const j = s.jobs.find((j) => j.kind === "text" && j.state === "queued")!;
  assert.ok(j);
  assert.equal(canDispatchJob(s, DEMO_ACTOR, j), true);
  j.state = "succeeded";
  j.actual = 1;
  j.reserved = 0;
  settleWrittenOutput(
    s,
    j,
    {
      completion: "complete",
      text: JSON.stringify({
        body: `A useful handoff may document routines and contacts. Corrected pass ${round}.`,
        metadata: "",
        sources: [],
        questions: [],
      }),
    },
    now,
  );
  assert.equal(j.outputStatus, "applied");
  assert.equal(s.contents[0].state, "review");
  return orchestrateReviewPreparation(s, now);
}
test("review findings trigger one correction, preserve old copy, then re-review exact revision before founder readiness", () => {
  let s = fixture();
  const original = s.contents[0].text;
  s = settleReview(s);
  assert.equal(s.jobs.filter((j) => j.kind === "text").length, 1);
  const correction = s.jobs.find((j) => j.kind === "text")!;
  assert.ok(correction.reviewCorrection);
  assert.equal(orchestrateReviewPreparation(s, now).jobs.length, s.jobs.length);
  s = fix(s, 1);
  assert.ok(s.contents[0].history.some((h) => h.text === original));
  assert.equal(s.jobs.filter((j) => j.kind === "review").length, 2);
  s = settleReview(s, false);
  assert.equal(s.contents[0].reviewCycle?.status, "ready");
  assert.equal(s.packages.length, 0, "AI cannot approve/publish");
});
test("two rounds are the hard limit and unresolved findings stop without a third paid request", () => {
  let s = settleReview(fixture());
  s = fix(s, 1);
  s = settleReview(s);
  s = fix(s, 2);
  s = settleReview(s);
  assert.equal(s.contents[0].reviewCycle?.rounds, 2);
  assert.equal(s.contents[0].reviewCycle?.status, "needs_input");
  assert.equal(s.jobs.filter((j) => j.kind === "text").length, 2);
  assert.equal(orchestrateReviewPreparation(s, now).jobs.length, s.jobs.length);
});
test("budget checks stop before a correction that cannot leave allowance for a recheck", () => {
  let s = fixture();
  s.preparations![0].maxCents = 2;
  s = settleReview(s);
  assert.equal(s.jobs.filter((j) => j.kind === "text").length, 0);
  assert.match(s.contents[0].reviewCycle!.reason!, /cannot cover/);
});
test("unknown, failed and invalid existing corrections never automatically retry", () => {
  for (const outcome of ["unknown", "failed", "succeeded"] as const) {
    let s = settleReview(fixture());
    const j = s.jobs.find((j) => j.kind === "text")!;
    j.state = outcome;
    j.error = "Retained outcome needs attention.";
    j.outputStatus = "invalid";
    const total = s.jobs.length;
    s = orchestrateReviewPreparation(s, now);
    assert.equal(s.jobs.length, total);
    assert.equal(s.contents[0].reviewCycle!.status, "stopped");
  }
});
test("human edits, approved snapshots and disabled policy prevent correction dispatch and replacement", () => {
  for (const change of ["edit", "approval", "disabled"] as const) {
    const s = settleReview(fixture()),
      j = s.jobs.find((j) => j.kind === "text")!,
      d = s.contents[0];
    if (change === "edit") {
      d.text = "New human wording.";
      d.revision++;
    }
    if (change === "approval")
      s.packages.push({ contentId: d.id, revision: d.revision } as any);
    if (change === "disabled") s.settings.reviewPolicy!.autoCorrect = false;
    assert.equal(canDispatchJob(s, DEMO_ACTOR, j), false);
    const before = d.text;
    j.state = "succeeded";
    settleWrittenOutput(
      s,
      j,
      {
        completion: "complete",
        text: JSON.stringify({
          body: "This stale automatic replacement must not apply.",
          metadata: "",
          sources: [],
          questions: [],
        }),
      },
      now,
    );
    assert.equal(d.text, before);
    assert.equal(j.outputStatus, "conflict");
  }
});
test("genuine missing facts retain a candidate and produce targeted founder questions without replacing human copy", () => {
  let s = settleReview(fixture());
  const j = s.jobs.find((j) => j.kind === "text")!,
    before = s.contents[0].text;
  j.state = "succeeded";
  settleWrittenOutput(
    s,
    j,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "A proposed correction requires a personal fact.",
        metadata: "",
        sources: [],
        questions: ["Which installation did you personally test?"],
      }),
    },
    now,
  );
  s = orchestrateReviewPreparation(s, now);
  assert.equal(s.contents[0].text, before);
  assert.equal(s.contents[0].reviewCycle?.status, "needs_input");
  assert.match(s.contents[0].reviewCycle!.reason!, /personally test/);
});
test('review accepts only supplied canonical research and newsletter source IDs',async()=>{const {suppliedReviewReferences}=await import('../lib/studio/review-references');const job={workflowSnapshot:{references:['workflow-ref']},prompt:JSON.stringify({webEvidence:[{jobId:'research-job',citations:[{referenceId:'research:research-job:source:1'}]}],newsletterSources:[{referenceId:'newsletter-source:1'}]})}as Job;const allowed=suppliedReviewReferences(job);assert.ok(allowed.has('workflow-ref'));assert.ok(allowed.has('research:research-job:source:1'));assert.ok(allowed.has('newsletter-source:1'));assert.ok(!allowed.has('invented-source'));});
