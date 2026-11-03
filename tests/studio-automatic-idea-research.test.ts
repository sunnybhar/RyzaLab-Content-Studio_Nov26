import { test } from "node:test";
import assert from "node:assert/strict";
import { automaticIdeaResearch } from "../lib/studio/automatic-idea-research";
import { commandSchema } from "../lib/studio/commands";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { saveBoundedWorkflowSetup } from "../lib/studio/bounded-workflow-setup";
import { applyCommand } from "../lib/studio/engine";
import { quote } from "../lib/studio/pricing";
import { ideaJobInput } from "../lib/studio/idea-generation";
import { retrievePublicReferences } from "../lib/studio/public-retrieval";
import { generationInput } from "../lib/studio/generation";
const now = "2026-11-03T01:00:00Z";
function fixture() {
  let s = initialState(DEMO_ACTOR, true);
  s.settings.qualifiedRates = [];
  s.settings.monthlyCap = 500;
  s.settings.requestCap = 50;
  s.settings.confirmationThreshold = 50;
  s.connections.push({
    id: "writing",
    title: "Fixture writing",
    provider: "anthropic",
    function: "text",
    model: "claude-sonnet-5-5",
    hasKey: true,
    status: "validated",
    updatedAt: now,
  });
  s = saveBoundedWorkflowSetup(
    s,
    DEMO_ACTOR,
    {
      connectionId: "writing",
      expectedVersion: s.version,
      channels: ["LinkedIn", "Newsletter"],
    },
    {
      model: "claude-sonnet-5-5",
      maxInputTokens: 1000000,
      maxOutputTokens: 128000,
    },
    now,
  );
  return s;
}
const input = () =>
  commandSchema.parse({
    type: "idea.generate",
    automaticResearch: true,
    channel: "LinkedIn",
    topic: "Home automation handoff",
    audience: "Households",
    quantity: 3,
    research: true,
    sourceText: "Private notes for the model only.",
    idempotencyKey: "auto-ideas",
  }) as Extract<
    import("zod").infer<typeof commandSchema>,
    { type: "idea.generate" }
  >;
const refs = () =>
  retrievePublicReferences(
    "home automation",
    async (url) =>
      Response.json(
        String(url).includes("wikipedia")
          ? {
              query: {
                pages: {
                  1: {
                    title: "Home automation",
                    extract:
                      "A source about household automation controls and documentation. ".repeat(
                        4,
                      ),
                  },
                },
              },
            }
          : { message: { items: [] } },
      ),
    now,
  );
test("automatic idea generation retrieves public evidence and freezes it before the paid job; replay never researches twice", async () => {
  const s = fixture(),
    c = input();
  let calls = 0;
  const retrieve = async (query: string) => {
    calls++;
    assert.equal(query, c.topic);
    assert.ok(!query.includes("Private notes"));
    return refs();
  };
  const prepared = await automaticIdeaResearch(s, DEMO_ACTOR, c, retrieve, now);
  assert.equal(s.jobs.length, 0);
  assert.equal(prepared.state.jobs.length, 1);
  assert.equal(prepared.state.jobs[0].kind, "research");
  const priced = quote(
    prepared.state,
    ideaJobInput(prepared.state, DEMO_ACTOR, prepared.command),
  );
  const next = applyCommand(prepared.state, DEMO_ACTOR, prepared.command, {
    now,
    quotedCost: priced.cost,
    pricingSnapshot: priced.pricingSnapshot,
  });
  const job = next.jobs.find((j) => j.kind === "ideas")!;
  assert.equal(
    JSON.parse(job.prompt).webEvidence[0].citations[0].url,
    "https://en.wikipedia.org/wiki/Home_automation",
  );
  assert.equal(job.researchSnapshots?.length, 1);
  assert.equal(job.reserved, priced.cost);
  assert.equal(calls, 1);
  const replay = await automaticIdeaResearch(
    next,
    DEMO_ACTOR,
    c,
    retrieve,
    now,
  );
  assert.equal(replay.existing, true);
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      automaticIdeaResearch(
        next,
        DEMO_ACTOR,
        { ...c, topic: "A different topic" },
        retrieve,
        now,
      ),
    /different idea request/,
  );
  assert.equal(calls, 1);
});
test("manual assistance preserves purpose, saves actual evidence on the original manual idea and carries it into writing", async () => {
  const c = { ...input(), purpose: "manual_assistance" as const, quantity: 1 };
  const prepared = await automaticIdeaResearch(
    fixture(),
    DEMO_ACTOR,
    c,
    async () => refs(),
    now,
  );
  const priced = quote(
    prepared.state,
    ideaJobInput(prepared.state, DEMO_ACTOR, prepared.command),
  );
  let next = applyCommand(prepared.state, DEMO_ACTOR, prepared.command, {
    now,
    quotedCost: priced.cost,
    pricingSnapshot: priced.pricingSnapshot,
  });
  assert.equal(next.jobs[0].ideaPurpose, "manual_assistance");
  const ids = next.jobs[0].researchJobIds;
  next = applyCommand(
    next,
    DEMO_ACTOR,
    {
      type: "idea.create",
      title: "My own handoff idea",
      brief: "My own angle remains unchanged.",
      channel: "LinkedIn",
      researchJobIds: ids,
    },
    { now },
  );
  const idea = next.ideas[0];
  assert.equal(idea.origin, "manual");
  assert.equal(idea.brief, "My own angle remains unchanged.");
  assert.deepEqual(idea.sources, [
    "https://en.wikipedia.org/wiki/Home_automation",
  ]);
  next = applyCommand(
    next,
    DEMO_ACTOR,
    { type: "idea.use", id: idea.id, format: "Text post", account: "RyzaLab" },
    { now },
  );
  const draft = next.contents[0];
  assert.deepEqual(draft.researchJobIds, ids);
  const writing = generationInput(next, DEMO_ACTOR, {
    contentId: draft.id,
    expectedRevision: draft.revision,
    kind: "text",
    idempotencyKey: "write-from-manual",
  });
  assert.equal(
    JSON.parse(writing.prompt).webEvidence[0].citations[0].url,
    idea.sources[0],
  );
});
test("unauthorized, unaffordable or failed source retrieval never starts a paid job", async () => {
  let calls = 0;
  const retrieve = async () => {
    calls++;
    return refs();
  };
  const s = fixture();
  s.settings.monthlyCap = 0;
  await assert.rejects(() =>
    automaticIdeaResearch(s, DEMO_ACTOR, input(), retrieve, now),
  );
  assert.equal(calls, 0);
  await assert.rejects(() =>
    automaticIdeaResearch(
      fixture(),
      { id: "other", email: "other@example.com" },
      input(),
      retrieve,
      now,
    ),
  );
  assert.equal(calls, 0);
  const original = fixture();
  await assert.rejects(
    () =>
      automaticIdeaResearch(
        original,
        DEMO_ACTOR,
        input(),
        async () => {
          throw new Error("No usable public excerpts");
        },
        now,
      ),
    /No usable public/,
  );
  assert.equal(original.jobs.length, 0);
});
