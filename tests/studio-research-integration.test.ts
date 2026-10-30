import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import {
  researchEvidence,
  researchJobInput,
} from "../lib/studio/research-link";
import { generationInput } from "../lib/studio/generation";
import { ideaJobInput } from "../lib/studio/idea-generation";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
import { updateRates } from "../lib/studio/rate-management";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { quote } from "../lib/studio/pricing";
import type { Job, StudioState } from "../lib/studio/types";
const now = "2026-10-30T12:00:00Z";
export function researchFixture() {
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
  s.settings.requestCap = 50;
  s.settings.confirmationThreshold = 0;
  const c = s.contents[0];
  c.channel = "LinkedIn";
  c.text = "";
  c.metadata = "";
  c.media = structuredClone(EMPTY_MEDIA);
  c.format = "Text post";
  for (const kind of ["research", "ideas", "text", "review"] as const) {
    s.connections.push({
      id: kind,
      title: `Fixture ${kind}`,
      provider: "anthropic",
      model: "local-qualified-model",
      function: kind,
      hasKey: true,
      status: "validated",
      updatedAt: now,
      ...{ maxRequestCost: 10 },
    });
  }
  s.workflows.find(
    (w) => w.channel === "LinkedIn" && w.status === "active",
  )!.functionConnections = {
    research: "research",
    ideas: "ideas",
    text: "text",
    review: "review",
  };
  s.jobs.push({
    id: "cited",
    kind: "research",
    channel: "LinkedIn",
    prompt: "Public handoff practices",
    connectionId: "research",
    estimate: 10,
    reserved: 10,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: "cited-key",
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
    result: JSON.stringify({
      version: 1,
      summary: "A neutral public finding.",
      citations: [
        {
          url: "https://example.com/source",
          title: "Source fixture",
          citedText: "A relevant excerpt.",
        },
      ],
      claims: [
        {
          text: "A neutral public finding.",
          sourceUrls: ["https://example.com/source"],
        },
      ],
      retrievedAt: now,
      searchesObserved: 1,
      stopReason: "end_turn",
      errors: [],
      status: "cited_research",
      notice:
        "Provider citations are evidence, not independently verified truth.",
    }),
  });
  return s;
}
const ideaInput = {
  channel: "LinkedIn" as const,
  topic: "Household handoffs",
  audience: "Family caregivers",
  quantity: 3,
  research: true,
  researchJobIds: ["cited"],
  sourceText: "",
  idempotencyKey: "ideas-key",
};
test("completed cited evidence enters ideas and writing with retained IDs, excerpts, date and finding-source links", () => {
  const s = researchFixture();
  const ideas = ideaJobInput(s, DEMO_ACTOR, ideaInput);
  const prompt = JSON.parse(ideas.prompt);
  assert.equal(prompt.webEvidence[0].retrievedAt, now);
  assert.equal(
    prompt.webEvidence[0].claims[0].sourceUrls[0],
    "https://example.com/source",
  );
  assert.equal(prompt.quantity, 3);
  assert.deepEqual(ideas.researchJobIds, ["cited"]);
  const c = s.contents[0];
  const writing = generationInput(s, DEMO_ACTOR, {
    contentId: c.id,
    kind: "text",
    expectedRevision: c.revision,
    researchJobIds: ["cited"],
    idempotencyKey: "writing",
  });
  assert.equal(
    JSON.parse(writing.prompt).webEvidence[0].citations[0].citedText,
    "A relevant excerpt.",
  );
  assert.match(
    JSON.parse(writing.prompt).evidenceScope,
    /Personal experiences/,
  );
  c.researchJobIds = ["cited"];
  assert.deepEqual(
    generationInput(s, DEMO_ACTOR, {
      contentId: c.id,
      kind: "review",
      expectedRevision: c.revision,
      idempotencyKey: "review",
    }).researchJobIds,
    ["cited"],
  );
});
test("uncited, incomplete, unknown, other-channel and inaccessible research cannot be selected", () => {
  for (const mutate of [
    (s: StudioState) => (s.jobs[0].state = "unknown"),
    (s: StudioState) => (s.jobs[0].channel = "Reddit"),
    (s: StudioState) => (s.jobs[0].createdBy = "another@example.com"),
    (s: StudioState) =>
      (s.jobs[0].result = JSON.stringify({ summary: "Uncited assertion" })),
  ]) {
    const s = researchFixture();
    mutate(s);
    if (s.jobs[0].createdBy !== DEMO_ACTOR.email) {
      const member = s.members.find((m) => m.email === DEMO_ACTOR.email)!;
      member.roles = ["creator"];
      member.grants = [];
    }
    assert.throws(() => researchEvidence(s, DEMO_ACTOR, "LinkedIn", ["cited"]));
  }
  assert.throws(
    () =>
      ideaJobInput(researchFixture(), DEMO_ACTOR, {
        ...ideaInput,
        researchJobIds: [],
      }),
    /Run web research/,
  );
});
test("public research contains only explicit query; canonical draft search consumes one total package allowance and is idempotent", () => {
  let s = researchFixture();
  const c = s.contents[0];
  c.text = "PRIVATE DRAFT MUST NOT BE APPENDED";
  const command = {
    type: "research.start",
    channel: "LinkedIn",
    contentId: c.id,
    query: "Public handoff practices",
    idempotencyKey: "new-research",
  };
  const payload = researchJobInput(
    s,
    DEMO_ACTOR,
    command as Parameters<typeof researchJobInput>[2],
  );
  assert.equal(payload.prompt, command.query);
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, command, { demo: true, now }),
    /package budget authorization/,
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      expectedRevision: c.revision,
      maxCents: 50,
    },
    { demo: true, now },
  );
  const next = applyCommand(s, DEMO_ACTOR, command, { demo: true, now });
  const job = next.jobs[0];
  assert.equal(job.state, "queued");
  assert.equal(job.prompt, command.query);
  assert.equal(job.reserved, 10);
  assert.ok(job.preparationId);
  assert.equal(
    applyCommand(next, DEMO_ACTOR, command, { demo: true, now }).jobs.length,
    next.jobs.length,
  );
  assert.throws(
    () =>
      researchJobInput(next, DEMO_ACTOR, {
        ...command,
        channel: "LinkedIn",
        idempotencyKey: "repeat-key",
      }),
    /existing research request/,
  );
  next.jobs[0].state = "unknown";
  assert.throws(
    () =>
      researchJobInput(next, DEMO_ACTOR, {
        ...command,
        channel: "LinkedIn",
        idempotencyKey: "repeat-key",
      }),
    /existing research request/,
  );
});
test("selected evidence is frozen and checked again before provider disclosure", () => {
  let s = researchFixture();
  const c = s.contents[0];
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      expectedRevision: c.revision,
      maxCents: 50,
    },
    { demo: true, now },
  );
  const input = generationInput(s, DEMO_ACTOR, {
    contentId: c.id,
    kind: "text",
    expectedRevision: c.revision,
    researchJobIds: ["cited"],
    idempotencyKey: "writer",
  });
  const next = applyCommand(s, DEMO_ACTOR, input, {
    demo: true,
    now,
    canonicalGeneration: true,
  });
  const job = next.jobs[0];
  assert.equal(job.researchSnapshots?.[0].raw, s.jobs[0].result);
  assert.equal(canDispatchJob(next, DEMO_ACTOR, job), true);
  next.jobs.find((j) => j.id === "cited")!.result = next.jobs
    .find((j) => j.id === "cited")!
    .result!.replace("neutral", "modified");
  assert.equal(canDispatchJob(next, DEMO_ACTOR, job), false);
  const before=next.contents[0].text;job.state="succeeded";settleWrittenOutput(next,job,{completion:"complete",text:JSON.stringify({body:"A changed-source result must stay retained.",metadata:"",sources:[],questions:[]})},now);assert.equal(next.contents[0].text,before);assert.equal(job.outputStatus,"conflict");
});
test("research pricing qualification rejects missing search bounds and unsupported providers", () => {
  const s = researchFixture();
  const card = {
    provider: "anthropic",
    model: "local-qualified-model",
    function: "research",
    currency: "USD",
    inputCentsPerMillion: 100,
    outputCentsPerMillion: 500,
    maxInputBytes: 50000,
    maxOutputTokens: 1000,
    fixedCents: 10,
    webSearchTool: "web_search_20250305",
    maxSearchUses: 1,
    source: "https://example.com/prices",
    verifiedAt: "2026-10-29",
    qualified: true,
  };
  const args = {
    action: "save",
    expectedVersion: 0,
    card,
    evidence: "Local fixture adapter and search budget qualification only.",
  };
  const updated = updateRates(
    s,
    DEMO_ACTOR,
    args,
    [],
    now,
    "research-registry",
  );
  assert.equal(updated.settings.qualifiedRates?.[0].function, "research");
  const quoted = quote(
    updated,
    researchJobInput(updated, DEMO_ACTOR, {
      channel: "LinkedIn",
      query: "Public routine practices",
      idempotencyKey: "rate",
    }),
  );
  assert.equal(quoted.cost, 10);
  assert.throws(
    () =>
      updateRates(
        s,
        DEMO_ACTOR,
        { ...args, card: { ...card, fixedCents: undefined } },
        [],
        now,
        "bad",
      ),
    /fixed reservation/,
  );
  assert.throws(
    () =>
      updateRates(
        s,
        DEMO_ACTOR,
        { ...args, card: { ...card, provider: "google" } },
        [],
        now,
        "bad",
      ),
    /bounded-search/,
  );
});
