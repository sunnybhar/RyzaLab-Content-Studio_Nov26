import {ideaResearchQuery} from "../lib/studio/idea-research-query";
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
import { researchCoverage } from "../lib/studio/research-methodology";
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
          : { message: { items: [{title:["Home automation"],DOI:"10.1000/home-automation",abstract:"A source about household automation controls and documentation. ".repeat(5)}] } },
      ),
    now,
  );
test("automatic idea generation retrieves public evidence and freezes it before the paid job; replay never researches twice", async () => {
  const s = fixture(),
    c = input();
  let calls = 0;
  const retrieve = async (query: string) => {
    calls++;
    assert.equal(query, ideaResearchQuery(c.topic, c.audience));
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
    "https://doi.org/10.1000/home-automation",
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
    "https://doi.org/10.1000/home-automation",
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

test('linked instructions are priced and frozen on a real idea job without entering its public query',async()=>{
 const s=fixture(),secret='Distinctive private RyzaLab instruction';
 s.agentRuleFiles=[{id:'rules',channel:'LinkedIn',slot:'instructions',fileName:'instructions.md',base64:Buffer.from(secret).toString('base64'),byteSize:Buffer.byteLength(secret),extractedText:secret,uploadedBy:DEMO_ACTOR.email,uploadedAt:now}];
 const c=input();const p=await automaticIdeaResearch(s,DEMO_ACTOR,c,async(query)=>{assert.ok(!query.includes(secret));return refs();},now);
 const command=ideaJobInput(p.state,DEMO_ACTOR,p.command),priced=quote(p.state,command);
 const empty=structuredClone(p.state);empty.agentRuleFiles=[];assert.ok(priced.pricingSnapshot.inputBytes>quote(empty,command).pricingSnapshot.inputBytes);
 const next=applyCommand(p.state,DEMO_ACTOR,command,{now,quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot});
 const job=next.jobs.find(j=>j.kind==='ideas')!;assert.equal(job.agentContextSnapshot!.rules[0].text,secret);
 next.agentRuleFiles![0].extractedText='Later edit';assert.equal(job.agentContextSnapshot!.rules[0].text,secret);
});

test('large legacy references plus uploaded guidance fit the existing cap and freeze the exact priced system',async()=>{
 const {frozenSystem}=await import('../lib/studio/pricing');const {requestBytes}=await import('../lib/studio/system-context');
 const s=fixture(),w=s.workflows.find(w=>w.channel==='LinkedIn'&&w.status==='active')!;w.guardrails='Never claim absolute privacy or invent personal experiences.';w.checks='Human factual review is required.';
 w.references=[];for(let n=0;n<8;n++){const id='large-reference-'+n;s.references.push({id,title:'Household privacy reference '+n,kind:'brand',channel:'LinkedIn',createdAt:now,content:('# Household privacy\nApple and Google home controls involve specific settings, data flows and limitations.\n').repeat(600)+'\nDistinct source '+n});w.references.push(id);}
 s.agentRuleFiles=[{id:'instructions',channel:'LinkedIn',slot:'instructions',fileName:'instructions.md',base64:Buffer.from('Write carefully.').toString('base64'),byteSize:16,extractedText:'Write carefully. Never invent a brand allegation.',uploadedBy:DEMO_ACTOR.email,uploadedAt:now}];
 const originals=structuredClone(s.references);const c=input();c.topic='How Apple and Google home automation devices affect family privacy and security';c.quantity=1;
 const prepared=await automaticIdeaResearch(s,DEMO_ACTOR,c,async()=>refs(),now);const command=ideaJobInput(prepared.state,DEMO_ACTOR,prepared.command);const priced=quote(prepared.state,command);
 const next=applyCommand(prepared.state,DEMO_ACTOR,command,{now,quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot});const job=next.jobs.find(j=>j.kind==='ideas')!;
 assert.ok(job.systemSnapshot);assert.equal(requestBytes(frozenSystem(job),job.prompt),priced.pricingSnapshot.inputBytes);assert.ok(priced.pricingSnapshot.inputBytes<=65536);assert.match(frozenSystem(job),/Never claim absolute privacy/);assert.match(frozenSystem(job),/Never invent a brand allegation/);assert.match(frozenSystem(job),/bounded-local-excerpts-v1/);assert.equal(job.referenceSnapshots!.length,8);assert.deepEqual(s.references,originals);
 const frozen=frozenSystem(job);next.references[0].content='Later changes';assert.equal(frozenSystem(job),frozen);
});
test('mandatory policy and Instructions are never silently shortened to fit a request',()=>{
 const s=fixture(),w=s.workflows.find(w=>w.channel==='LinkedIn'&&w.status==='active')!;w.instructions='Mandatory writing instructions. '.repeat(4000);
 const command=ideaJobInput(s,DEMO_ACTOR,{...input(),research:false,researchJobIds:[]});assert.throws(()=>quote(s,command),/protected rules, Instructions and task/);assert.equal(s.jobs.length,0);
});

test('oversized idea counts are blocked before spending instead of guaranteeing output truncation',()=>{
 const s=fixture(),c={...input(),quantity:7,research:false,researchJobIds:[]};const command=ideaJobInput(s,DEMO_ACTOR,c);assert.throws(()=>quote(s,command),/at most 6 ideas/);assert.equal(s.jobs.length,0);
});

test("research is saved before idea enqueue and a stopped enqueue can reuse it without another retrieval",async()=>{
 const s=fixture(),c=input();let calls=0;let saved:typeof s|undefined;
 const retrieve=async()=>{calls++;return refs();};
 const prepared=await automaticIdeaResearch(s,DEMO_ACTOR,c,retrieve,now,async next=>{saved=structuredClone(next);});
 assert.ok(saved);assert.equal(saved.jobs.length,1);assert.equal(saved.jobs[0].kind,"research");
 const blocked=structuredClone(saved);blocked.settings.requestCap=0;
 assert.throws(()=>applyCommand(blocked,DEMO_ACTOR,prepared.command,{now,quotedCost:50}));
 assert.equal(saved.jobs[0].state,"succeeded");
 const replay=await automaticIdeaResearch(saved,DEMO_ACTOR,c,async()=>{throw Error("Saved research must not be retrieved twice");},now);
 assert.equal(calls,1);assert.equal(replay.command.researchJobIds?.[0],saved.jobs[0].id);
 const generation=ideaJobInput(replay.state,DEMO_ACTOR,replay.command);
 assert.equal(JSON.parse(generation.prompt).webEvidence[0].jobId,saved.jobs[0].id);
});

test("a fresh idea attempt supplements same-topic research and uses distinct citations", async () => {
  const c = input();
  const withSources = async (offset: number) => {
    const example = await refs();
    return {
      ...example,
      citations: Array.from({ length: offset ? 6 : 5 }, (_, index) => ({
        ...example.citations[0], url: `https://example.org/report-${offset + index}`,
      })),
    };
  };
  const first = await automaticIdeaResearch(fixture(), DEMO_ACTOR, c, async () => withSources(0), now);
  const second = await automaticIdeaResearch(first.state, DEMO_ACTOR, { ...c, idempotencyKey: "fresh-attempt" },
    async () => withSources(4), now);
  assert.equal(second.command.researchJobIds?.length, 2);
  const prepared = ideaJobInput(second.state, DEMO_ACTOR, second.command);
  assert.equal(researchCoverage(prepared.prompt), 10);
  assert.equal(JSON.parse(prepared.prompt).webEvidence.flatMap((item: { citations: unknown[] }) => item.citations).length, 10);
});
