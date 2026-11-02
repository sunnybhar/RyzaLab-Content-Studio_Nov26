import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialState,DEMO_ACTOR} from '../lib/studio/seed';
import {saveBoundedWorkflowSetup} from '../lib/studio/bounded-workflow-setup';
import {inspectClaudeModelBounds} from '../lib/studio/model-discovery';
import {ideaJobInput} from '../lib/studio/idea-generation';
import {applyCommand} from '../lib/studio/engine';import {quote} from '../lib/studio/pricing';
const now='2026-11-02T12:00:00Z';
function fixture(){const s=initialState(DEMO_ACTOR,true);s.connections.push({id:'writing',title:'Writing',provider:'anthropic',function:'text',model:'claude-sonnet-5-5',hasKey:true,status:'unverified',updatedAt:'before'});return s;}
test('tool-free setup does not require native web search and preserves founder budgets/channel overrides',async()=>{
 const s=fixture(),before=structuredClone(s);
 const cap=await inspectClaudeModelBounds('claude-sonnet-5-5','fixture',async()=>Response.json({id:'claude-sonnet-5-5',max_input_tokens:1000000,max_tokens:128000}));assert.equal(cap.webSearchSupported,false);
 const next=saveBoundedWorkflowSetup(s,DEMO_ACTOR,{connectionId:'writing',expectedVersion:s.version},cap,now);
 assert.deepEqual(next.settings.reviewPolicy,before.settings.reviewPolicy);assert.equal(next.settings.monthlyCap,before.settings.monthlyCap);assert.equal(next.settings.requestCap,before.settings.requestCap);assert.deepEqual(next.workflows,before.workflows);
 assert.deepEqual(next.connections.at(-1)?.supportedFunctions,['text','ideas','review']);assert.equal(next.settings.qualifiedRates?.filter(r=>r.model==='claude-sonnet-5-5').length,3);
 assert.equal(next.jobs.length,s.jobs.length);
 for(const w of next.workflows){w.functionConnections={};w.connectionId='';}
 const request=ideaJobInput(next,DEMO_ACTOR,{channel:'LinkedIn',topic:'Simple household handoff documentation',audience:'Households',quantity:1,research:false,sourceText:'General guidance only.',idempotencyKey:'bounded-idea'});assert.equal(request.connectionId,'writing');
 const priced=quote(next,request);assert.ok(priced.cost<=16);const enqueued=applyCommand(next,DEMO_ACTOR,request,{quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot,now});assert.equal(enqueued.jobs[0].kind,'ideas');assert.equal(enqueued.jobs[0].connectionId,'writing');
});
test('stale setup and unauthorized actor cannot change defaults',()=>{
 const s=fixture(),cap={model:'claude-sonnet-5-5',maxInputTokens:1000000,maxOutputTokens:128000};
 assert.throws(()=>saveBoundedWorkflowSetup(s,DEMO_ACTOR,{connectionId:'writing',expectedVersion:999},cap,now),/Workspace changed/);
 assert.throws(()=>saveBoundedWorkflowSetup(s,{id:'outside',email:'outside@example.com'},{connectionId:'writing',expectedVersion:s.version},cap,now));assert.equal(s.connections.at(-1)?.supportedFunctions,undefined);
});
