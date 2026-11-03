import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { saveBoundedWorkflowSetup } from "../lib/studio/bounded-workflow-setup";
import {
  startVerificationPack,
  advanceVerificationPacks,
  verificationPreflight,
  extendVerificationPack,
} from "../lib/studio/verification-pack";
import { retrievePublicReferences } from "../lib/studio/public-retrieval";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
const now = "2026-11-02T12:00:00Z";
function setup() {
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
      autoReview: false,
    },
    { demo: true, now },
  );
  s.settings.confirmationThreshold = 1;
  s.settings.requestCap = 50;
  s.connections.push({
    id: "bounded-writing",
    title: "Writing",
    provider: "anthropic",
    function: "text",
    model: "claude-sonnet-5-5",
    hasKey: true,
    status: "unverified",
    updatedAt: now,
  });
  s = saveBoundedWorkflowSetup(
    s,
    DEMO_ACTOR,
    { connectionId: "bounded-writing", expectedVersion: s.version },
    {
      model: "claude-sonnet-5-5",
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
    },
    now,
  );
  for (const w of s.workflows) {
    w.functionConnections = {};
    w.connectionId = "";
  }
  return s;
}
async function references() {
  return retrievePublicReferences(
    "household checklist",
    async (url) =>
      Response.json(
        String(url).includes("wikipedia")
          ? {
              query: {
                pages: {
                  1: {
                    title: "Home automation",
                    extract:
                      "A household reference about controls and documentation. ".repeat(
                        5,
                      ),
                  },
                },
              },
            }
          : { message: { items: [] } },
      ),
    now,
  );
}
test("LOCAL MOCK ONLY: one pack prepares sequential AI cases and two manual drafts, retaining actual human approvals", async () => {
  let s = setup();
  const plan = verificationPreflight(s, DEMO_ACTOR, now);
  assert.equal(plan.preparationCents, 102);
  assert.equal(plan.reviewCents, 48);
  s = startVerificationPack(
    s,
    DEMO_ACTOR,
    "pack-local",
    await references(),
    now,
  );
  assert.equal(s.verificationRuns?.[0].cases[0].phase, "ideas");
  assert.equal(s.jobs.filter((j) => j.state === "queued").length, 1);
  assert.equal(
    s.jobs[0].state,
    "queued",
    "explicit package authorization prevents an extra per-job confirmation",
  );
  for (let step = 0; step < 12; step++) {
    const job = s.jobs.find((j) => j.state === "queued");
    if (!job) {
      s = advanceVerificationPacks(s, now);
      continue;
    }
    assert.equal(canDispatchJob(s, DEMO_ACTOR, job), true);
    job.state = "succeeded";
    job.actual = 2;
    job.reserved = 0;
    if (job.kind === "ideas") {
      const id = crypto.randomUUID();
      s.ideas.unshift({
        id,
        title: "A clear handoff checklist",
        brief:
          "Explain public documentation and simple controls without inventing personal experience.",
        channel: job.channel,
        state: "pending",
        sources: [],
        origin: "agent",
        generationRunId: job.id,
        researchJobIds: job.researchJobIds,
        createdBy: DEMO_ACTOR.email,
        createdAt: now,
      });
    } else {
      const body = {
        body: "A useful handoff explains everyday controls, the fallback when automation stops, and where to find instructions. This is general guidance from supplied public references, not a personal installation claim.",
        metadata: "",
        questions: [],
        sources: ["https://en.wikipedia.org/wiki/Home_automation"],
      };
      if(job.channel==="Newsletter")body.body=body.body.repeat(45);
      job.result = JSON.stringify(body);
      settleWrittenOutput(
        s,
        job,
        { text: job.result, completion: "complete" },
        now,
      );
    }
    s = advanceVerificationPacks(s, now);
  }
  const run = s.verificationRuns![0];
  assert.deepEqual(
    run.cases.map((c) => c.phase),
    ["ready", "ready", "ready", "manual_input", "manual_input"],
  );
  assert.equal(s.jobs.filter((j) => j.kind === "ideas").length, 3);
  assert.equal(s.jobs.filter((j) => j.kind === "text").length, 3);
  const newsletter = s.contents.find((c) => c.id === run.cases[2].contentId)!;
  assert.equal(newsletter.newsletterSource?.id, run.cases[0].contentId);
  assert.ok(
    s.contents.find((c) => c.id === run.cases[4].contentId)?.newsletterSource,
  );
  assert.equal(s.contents.filter((c) => c.copyAcceptances?.length).length, 0);
  assert.equal(s.packages.length, 0);
  assert.equal(startVerificationPack(s, DEMO_ACTOR, "pack-local", {}, now), s);
});
test("failure and draft edits stop automatic paid preparation without retries", async () => {
  let s = startVerificationPack(
    setup(),
    DEMO_ACTOR,
    "fail-local",
    await references(),
    now,
  );
  const job = s.jobs.find((j) => j.state === "queued")!;
  job.state = "unknown";
  job.error = "Uncertain outcome";
  s = advanceVerificationPacks(s, now);
  assert.equal(s.verificationRuns![0].cases[0].phase, "attention");
  assert.equal(s.jobs.filter((j) => j.kind === "ideas").length, 1);
  assert.equal(advanceVerificationPacks(s, now), s);
  let edited = startVerificationPack(
    setup(),
    DEMO_ACTOR,
    "edit-local",
    await references(),
    now,
  );
  edited.contents[0].text = "A human edit";
  edited = advanceVerificationPacks(edited, now);
  assert.equal(edited.verificationRuns![0].cases[0].phase, "attention");
  assert.equal(edited.contents[0].text, "A human edit");
});

test("a saved 0.3.9 first case extends without repeating its paid job IDs", async () => {
  let s = startVerificationPack(
    setup(),
    DEMO_ACTOR,
    "old-first-only",
    await references(),
    now,
  );
  let run = s.verificationRuns![0];
  run.cases = run.cases.slice(0, 1);
  run.maxPreparationCents = 32;
  const first = run.cases[0],
    ideaJob = s.jobs.find((j) => j.id === first.ideaJobId)!;
  ideaJob.state = "succeeded";
  ideaJob.actual = 2;
  ideaJob.reserved = 0;
  s.ideas.unshift({
    id: "old-idea",
    title: "A useful handoff",
    brief: "General guidance only with supplied sources.",
    channel: "LinkedIn",
    state: "pending",
    sources: [],
    generationRunId: ideaJob.id,
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
  });
  s = advanceVerificationPacks(s, now);
  run = s.verificationRuns![0];
  const writing = s.jobs.find((j) => j.id === run.cases[0].writingJobId)!;
  writing.state = "succeeded";
  writing.actual = 2;
  writing.reserved = 0;
  writing.result = JSON.stringify({
    body: "A household handoff explains everyday controls and where to find instructions.",
    metadata: "",
    questions: [],
    sources: [],
  });
  settleWrittenOutput(
    s,
    writing,
    { text: writing.result, completion: "complete" },
    now,
  );
  s = advanceVerificationPacks(s, now);
  const priorIds = {
      idea: s.verificationRuns![0].cases[0].ideaJobId,
      writing: s.verificationRuns![0].cases[0].writingJobId,
    },
    runId = run.id;
  s = extendVerificationPack(s, DEMO_ACTOR, runId, now);
  assert.equal(s.verificationRuns![0].cases.length, 5);
  assert.equal(s.verificationRuns![0].cases[0].ideaJobId, priorIds.idea);
  assert.equal(s.verificationRuns![0].cases[0].writingJobId, priorIds.writing);
  assert.equal(s.jobs.filter((j) => j.kind === "ideas").length, 2);
  assert.equal(s.jobs.filter((j) => j.kind === "text").length, 1);
  assert.equal(extendVerificationPack(s, DEMO_ACTOR, runId, now), s);
});
