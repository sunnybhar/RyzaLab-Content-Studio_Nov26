import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { orchestrateInitialWriting } from "../lib/studio/writing-orchestration";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
const now = "2026-10-30T12:00:00Z";
function fixture(autoDraft = true) {
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
      autoDraft,
      autoReview: true,
    },
    { now, demo: true },
  );
  s.settings.requestCap = 50;
  s.ideas.unshift({...s.ideas[0], id:"new-selected-idea", state:"pending", title:"A new household handoff idea"});
  const idea = s.ideas[0];
  const workflow = s.workflows.find(
    (w) => w.channel === idea.channel && w.status === "active",
  )!;
  s.connections.push({
    id: "writer",
    title: "Configured writer",
    provider: "anthropic",
    model: "writing-model",
    function: "text",
    hasKey: true,
    status: "validated",
    updatedAt: now,
    ...{ maxRequestCost: 50 },
  });
  workflow.functionConnections = {
    ...workflow.functionConnections,
    text: "writer",
  };
  s.settings.qualifiedRates = [
    {
      provider: "anthropic",
      model: "writing-model",
      function: "text",
      currency: "USD",
      fixedCents: 2,
      inputCentsPerMillion: 100,
      outputCentsPerMillion: 500,
      maxInputBytes: 500000,
      maxOutputTokens: 1000,
      source: "https://example.com/prices",
      verifiedAt: "2026-10-29",
      qualified: true,
    },
  ];
  return applyCommand(
    s,
    DEMO_ACTOR,
    { type: "idea.use", id: idea.id, format: "Text post", account: "RyzaLab" },
    { now },
  );
}
test("selecting one idea queues only one first-writing request and safely applies its exact result", () => {
  const s = fixture();
  const draft = s.contents[0];
  assert.ok(draft.initialWriting);
  assert.ok(draft.preparationId);
  assert.equal(s.jobs.length, 0);
  const next = orchestrateInitialWriting(s, now);
  assert.equal(next.jobs.length, 1);
  const job = next.jobs[0];
  assert.equal(job.state, "queued");
  assert.equal(job.outputContract, "draft_v1");
  assert.ok(job.reserved > 0);
  assert.equal(canDispatchJob(next, DEMO_ACTOR, job), true);
  assert.equal(orchestrateInitialWriting(next, now), next);
  job.state = "succeeded";
  job.actual = job.reserved;
  job.reserved = 0;
  settleWrittenOutput(
    next,
    job,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "A household handoff can document daily routines and useful contacts.",
        metadata: "",
        sources: [],
        questions: [],
      }),
    },
    now,
  );
  assert.match(next.contents[0].text, /household handoff/);
  assert.equal(job.outputStatus, "applied");
  assert.equal(orchestrateInitialWriting(next, now), next);
  const reopened = applyCommand(
    next,
    DEMO_ACTOR,
    {
      type: "idea.use",
      id: s.ideas[0].id,
      format: "Text post",
      account: "RyzaLab",
    },
    { now },
  );
  assert.equal(reopened.contents.length, next.contents.length);
  assert.equal(orchestrateInitialWriting(reopened, now).jobs.length, 1);
});
test("older drafts and opted-out selection never create automatic writing work", () => {
  const s = fixture(false);
  assert.equal(s.contents[0].initialWriting, undefined);
  assert.equal(orchestrateInitialWriting(s, now), s);
  s.settings.reviewPolicy!.autoDraft = true;
  assert.equal(orchestrateInitialWriting(s, now), s);
  const legacy = initialState(DEMO_ACTOR, true);
  assert.equal(orchestrateInitialWriting(legacy, now), legacy);
});
test("edits, changed context and revoked selectors never get automatic provider requests", () => {
  for (const mutate of [
    (s: ReturnType<typeof fixture>) => {
      s.contents[0].text = "Manual copy";
    },
    (s: ReturnType<typeof fixture>) => {
      s.references[0].content += " Updated evidence.";
    },
    (s: ReturnType<typeof fixture>) => {
      s.members[0].revoked = true;
    },
  ]) {
    const s = fixture();
    mutate(s);
    const next = orchestrateInitialWriting(s, now);
    assert.equal(next.jobs.length, 0);
    assert.ok(next.contents[0].automaticWriting?.error);
    assert.equal(next.contents[0].text, s.contents[0].text);
  }
});
test("missing qualification or exhausted total package budget saves the draft without spending", () => {
  for (const mutate of [
    (s: ReturnType<typeof fixture>) => {
      s.settings.qualifiedRates = [];
    },
    (s: ReturnType<typeof fixture>) => {
      s.preparations![0].maxCents = 1;
    },
    (s: ReturnType<typeof fixture>) => {
      s.contents[0].preparationId = undefined;
    },
  ]) {
    const s = fixture();
    mutate(s);
    const next = orchestrateInitialWriting(s, now);
    assert.equal(next.jobs.length, 0);
    assert.ok(next.contents[0].automaticWriting?.error);
    assert.equal(orchestrateInitialWriting(next, now), next);
  }
});
test("unknown and failed first attempts remain visible and never trigger automatic paid retries", () => {
  for (const outcome of ["unknown", "failed", "cancelled"] as const) {
    const next = orchestrateInitialWriting(fixture(), now);
    next.jobs[0].state = outcome;
    const held = orchestrateInitialWriting(next, now);
    assert.equal(held.jobs.length, 1);
    assert.ok(held.contents[0].automaticWriting?.error);
    assert.equal(orchestrateInitialWriting(held, now), held);
  }
  const next = orchestrateInitialWriting(fixture(), now);
  next.jobs[0].state = "succeeded";
  settleWrittenOutput(
    next,
    next.jobs[0],
    { completion: "incomplete", text: "unfinished" },
    now,
  );
  const held = orchestrateInitialWriting(next, now);
  assert.equal(held.contents[0].text, "");
  assert.equal(held.jobs.length, 1);
  assert.ok(held.contents[0].automaticWriting?.error);
});

test("a LinkedIn post and its Blog Article stay separate, and short model output does not fill the article", () => {
  const state = fixture();
  const post = state.contents[0];
  post.text = "A saved LinkedIn post.";
  state.settings.qualifiedRates![0].maxOutputTokens = 4096;
  const createArticle = {
    type: "idea.use", id: post.ideaId, account: post.account,
    targetChannel: "LinkedIn", format: "Article",
  };
  const withArticle = applyCommand(state, DEMO_ACTOR, createArticle, { now });
  const article = withArticle.contents[0];
  assert.notEqual(article.id, post.id);
  assert.equal(article.ideaId, post.ideaId);
  assert.equal(article.format, "Article");
  const next = orchestrateInitialWriting(withArticle, now);
  const job = next.jobs.find(entry => entry.contentId === article.id)!;
  assert.match(job.systemSnapshot!, /Aim for about 1,000–1,100 words/);
  job.state = "succeeded";
  const output = (body: string) => JSON.stringify({
    body, metadata: "", sources: ["https://example.org/guide"], questions: [],
  });
  settleWrittenOutput(next, job, {
    completion: "incomplete", text: output("A truncated article."),
  }, now);
  assert.equal(job.outputStatus, "incomplete");
  assert.equal(next.contents[0].text, "");
  settleWrittenOutput(next, job, {
    completion: "complete", text: output("An article angle. ".repeat(260) + "\n\n## Sources\n" + "Citation ".repeat(25)),
  }, now);
  assert.match(job.error!, /780 words/);
  assert.equal(job.outputStatus, "invalid");
  assert.equal(next.contents[0].text, "");
  assert.throws(() => applyCommand(next, DEMO_ACTOR, {
    type: "job.editDraft", jobId: job.id, expectedRevision: article.revision,
  }, { now }), /requires 800–1,200 words/);
  settleWrittenOutput(next, job, {
    completion: "complete", text: output("An article angle. ".repeat(300)),
  }, now);
  assert.equal(job.outputStatus, "applied");
  assert.equal(next.contents.find(item => item.id === post.id)?.text, post.text);
  assert.equal(applyCommand(next, DEMO_ACTOR, createArticle, { now }).contents.length, next.contents.length);
});
