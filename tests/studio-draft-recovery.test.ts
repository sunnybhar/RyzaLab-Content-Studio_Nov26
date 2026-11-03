import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { draftResultSchema, parseOutput } from "../lib/studio/output-contracts";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { copyIdentity, copyBlockers } from "../lib/studio/solo-quality";
import type { Job } from "../lib/studio/types";
const now = "2026-10-30T12:00:00Z";
const payload = {
  body: "A household routine can be documented. [Ryan to confirm: actual personal example]",
  metadata: {
    format: "LinkedIn text post",
    hook_note: "Use a verified opening",
    visual: "Optional non-identifying image",
    cta: "A conversation prompt",
    hashtags: "None",
    publication_notes: "Draft pending factual confirmation",
    guard_check: "No guarantee or unsupported claim",
  },
  sources: ["Provided internal reference, relevant section"],
  questions: ["Which real example supports this draft?"],
};
function fixture() {
  const s = initialState(DEMO_ACTOR, true),
    c = s.contents[0];
  c.text = "Current human text must remain unchanged.";
  const job: Job = {
    id: "saved-writing",
    kind: "text",
    channel: c.channel,
    account: c.account,
    contentId: c.id,
    prompt: "Canonical request",
    connectionId: "writer",
    estimate: 14,
    reserved: 14,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: "original-key",
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
    outputContract: "draft_v1",
    outputStatus: "invalid",
    targetRevision: c.revision,
    targetIdentity: copyIdentity(c, s),
    result: "```json\n" + JSON.stringify(payload) + "\n```",
  };
  s.jobs.push(job);
  return s;
}
test("flat metadata fields normalize to readable text without losing body, sources or questions", () => {
  const result = parseOutput(JSON.stringify(payload), draftResultSchema);
  assert.equal(result.body, payload.body);
  for (const [key, value] of Object.entries(payload.metadata))
    assert.ok(result.metadata.includes(`${key}: ${value}`));
  assert.deepEqual(result.sources, payload.sources);
  assert.deepEqual(result.questions, payload.questions);
  assert.equal(
    parseOutput(
      JSON.stringify({ ...payload, metadata: "Plain metadata" }),
      draftResultSchema,
    ).metadata,
    "Plain metadata",
  );
  for (const metadata of [
    { nested: { value: "unsupported" } },
    Object.fromEntries(
      Array.from({ length: 31 }, (_, i) => ["key" + i, "value"]),
    ),
    { large: "x".repeat(12001) },
  ])
    assert.throws(() =>
      parseOutput(JSON.stringify({ ...payload, metadata }), draftResultSchema),
    );
});
test("saved format-invalid response becomes a comparison candidate once, without altering content, cost, dispatch or raw result", () => {
  const s = fixture(),
    before = structuredClone(s.jobs[0]);
  const command = { type: "job.prepareSavedDraft", jobId: before.id };
  const next = applyCommand(s, DEMO_ACTOR, command, { demo: true, now });
  assert.deepEqual(next.contents, s.contents);
  assert.equal(next.jobs.length, 1);
  assert.equal(next.jobs[0].outputStatus, "ready");
  assert.equal(next.jobs[0].candidate!.body, payload.body);
  assert.deepEqual(next.jobs[0].candidate!.questions, payload.questions);
  for (const key of [
    "result",
    "state",
    "attempt",
    "estimate",
    "reserved",
    "actual",
    "idempotencyKey",
    "connectionId",
  ] as const)
    assert.deepEqual(next.jobs[0][key], before[key]);
  assert.deepEqual(
    applyCommand(next, DEMO_ACTOR, command, { demo: true, now }),
    next,
  );
  assert.throws(
    () =>
      applyCommand(
        next,
        DEMO_ACTOR,
        {
          type: "job.applyDraft",
          jobId: before.id,
          expectedRevision: next.contents[0].revision,
        },
        { demo: true, now },
      ),
    /missing facts/,
  );
  const applied = applyCommand(
    next,
    DEMO_ACTOR,
    {
      type: "job.applyDraft",
      jobId: before.id,
      expectedRevision: next.contents[0].revision,
      questionsResolution:
        "Retained as an unfinished sample; facts remain explicitly unconfirmed.",
    },
    { demo: true, now },
  );
  assert.ok(
    copyBlockers(applied.contents[0]).some((issue) =>
      issue.includes("confirm"),
    ),
  );
});
test("recovery refuses incomplete, uncertain, malformed or another creator’s saved response", () => {
  const command = { type: "job.prepareSavedDraft", jobId: "saved-writing" };
  for (const mutate of [
    (s: ReturnType<typeof fixture>) => {
      s.jobs[0].state = "unknown";
    },
    (s: ReturnType<typeof fixture>) => {
      s.jobs[0].outputStatus = "incomplete";
    },
    (s: ReturnType<typeof fixture>) => {
      s.jobs[0].result = '{"body":"Truncated';
    },
  ]) {
    const s = fixture();
    mutate(s);
    assert.throws(() =>
      applyCommand(s, DEMO_ACTOR, command, { demo: true, now }),
    );
    assert.equal(s.jobs[0].candidate, undefined);
  }
  const s = fixture();
  const other = { id: "other", email: "other@example.com" };
  s.members.push({
    ...other,
    roles: ["creator"],
    grants: [
      { action: "job.create", contentId: s.contents[0].id },
      { action: "read", contentId: s.contents[0].id },
      { action: "content.edit", contentId: s.contents[0].id },
    ],
    revoked: false,
  });
  assert.throws(
    () => applyCommand(s, other, command, { demo: true, now }),
    /another creator/,
  );
});
test("a new provider response with structured metadata and unanswered facts is held as a candidate, never auto-applied", () => {
  const s = fixture();
  delete s.jobs[0].candidate;
  s.jobs[0].outputStatus = undefined;
  settleWrittenOutput(
    s,
    s.jobs[0],
    { completion: "complete", text: JSON.stringify(payload) },
    now,
  );
  assert.equal(s.jobs[0].outputStatus, "ready");
  assert.equal(s.jobs[0].candidate!.body, payload.body);
  assert.match(s.contents[0].text, /Current human text/);
  assert.match(s.jobs[0].error!, /unresolved factual questions/);
});

test("opening an unfinished candidate in the editor retains provenance and every question as an approval blocker", () => {
  const s = fixture();
  const prepared = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "job.prepareSavedDraft", jobId: "saved-writing" },
    { demo: true, now },
  );
  const original = structuredClone(prepared.contents[0]);
  const result = applyCommand(
    prepared,
    DEMO_ACTOR,
    {
      type: "job.editDraft",
      jobId: "saved-writing",
      expectedRevision: original.revision,
    },
    { demo: true, now },
  );
  const c = result.contents[0];
  assert.equal(c.text, payload.body);
  assert.ok(c.metadata.includes(`[Confirm: ${payload.questions[0]}]`));
  assert.ok(copyBlockers(c).some((b) => b.includes(payload.questions[0])));
  assert.ok(c.history.some((h) => h.text === original.text));
  assert.equal(
    result.jobs.find((j) => j.id === "saved-writing")!.questionsDisposition,
    undefined,
  );
  assert.deepEqual(
    result.jobs.map((j) => [j.state, j.reserved, j.attempt]),
    prepared.jobs.map((j) => [j.state, j.reserved, j.attempt]),
  );
});

test("complete first writing appears in an unchanged empty editor with every factual question still blocking approval", () => {
 const s=fixture(), c=s.contents[0], job=s.jobs[0];
 c.text=""; job.targetIdentity=copyIdentity(c,s);
 settleWrittenOutput(s,job,{text:JSON.stringify(payload),completion:"complete"},now);
 assert.equal(c.text,payload.body); assert.equal(job.outputStatus,"applied");
 assert.ok(c.metadata.includes(`[Confirm: ${payload.questions[0]}]`));
 assert.ok(copyBlockers(c).some(x=>x.includes(payload.questions[0])));
 assert.equal(job.questionsDisposition,undefined);
});

test("truncated JSON body recovers readable paragraphs without completing missing words", async () => {
 const {incompleteDraftBody}=await import('../lib/studio/incomplete-draft');
 assert.equal(incompleteDraftBody('```json\n{"body":"A real paragraph.\\n\\nA second \\"quote\\" and unfinished'), 'A real paragraph.\n\nA second "quote" and unfinished');
 assert.equal(incompleteDraftBody('{"body":"Enough readable text\\u12'), 'Enough readable text');
 assert.equal(incompleteDraftBody('{"metadata":"ignore", "body":"Do not recover nested fields"}'), undefined);
 assert.equal(incompleteDraftBody('{"body":"Invalid escape \\x00"}'), undefined);
});
test("incomplete first writing enters an empty editor, preserves notes and remains blocked", () => {
 const s=fixture(), c=s.contents[0], job=s.jobs[0];c.text='';c.metadata='Existing editorial notes';job.targetIdentity=copyIdentity(c,s);
 const raw='```json\n{"body":"Checking on Mom\\n\\nA readable unfinished paragraph';job.result=raw;
 settleWrittenOutput(s,job,{text:raw,completion:'incomplete'},now);
 assert.match(c.text,/Checking on Mom\n\nA readable unfinished paragraph/);assert.doesNotMatch(c.text,/```|"body"/);
 assert.equal(c.metadata,'Existing editorial notes');assert.equal(job.result,raw);assert.equal(job.outputStatus,'incomplete');
 assert.ok(copyBlockers(c).some(x=>/incomplete/i.test(x)));assert.equal(s.jobs.length,1);
});
test("saved incomplete recovery makes no new request and rejects existing text or stale editor", () => {
 const s=fixture(),c=s.contents[0],job=s.jobs[0]; c.text='';job.targetIdentity=copyIdentity(c,s);job.outputStatus='incomplete';job.result='{"body":"A usable saved paragraph';
 const command={type:'job.recoverIncomplete',jobId:job.id,expectedRevision:c.revision};
 const next=applyCommand(s,DEMO_ACTOR,command,{demo:true,now});assert.match(next.contents[0].text,/A usable saved paragraph/);
 assert.equal(next.jobs.length,1);assert.equal(next.jobs[0].reserved,job.reserved);assert.equal(next.jobs[0].attempt,job.attempt);
 assert.throws(()=>applyCommand(next,DEMO_ACTOR,command,{demo:true,now}));
 c.text='Human changes';assert.throws(()=>applyCommand(s,DEMO_ACTOR,command,{demo:true,now}));
});

test('short unsourced AI newsletter stays visibly unfinished and carries its relevant image brief',()=>{
 const s=fixture(),c=s.contents[0],job=s.jobs[0];c.channel='Newsletter';job.channel='Newsletter';c.text='';c.media.imagePrompt='';job.targetIdentity=copyIdentity(c,s);
 settleWrittenOutput(s,job,{completion:'complete',text:JSON.stringify({body:'An introduction without sufficient detail.',metadata:'',sources:[],questions:[],imageBrief:'A simple labelled diagram of household controls.'})},now);
 assert.match(c.text,/An introduction/);assert.ok(copyBlockers(c).some(x=>x.includes('1,200')));assert.ok(copyBlockers(c).some(x=>/source citations/.test(x)));assert.equal(c.media.imagePrompt,'A simple labelled diagram of household controls.');assert.equal(s.packages.length,0);
});
test('newsletter sources enter the readable body while social post provenance stays separate',()=>{
 for(const channel of ['Newsletter','LinkedIn'] as const){const s=fixture(),c=s.contents[0],job=s.jobs[0];c.channel=channel;job.channel=channel;c.text='';job.targetIdentity=copyIdentity(c,s);
 settleWrittenOutput(s,job,{completion:'complete',text:JSON.stringify({body:'Detailed general household guidance. '.repeat(350),metadata:'',sources:['https://example.org/source'],questions:[]})},now);
 assert.equal(c.text.includes('## Sources'),channel==='Newsletter');
 }
});
