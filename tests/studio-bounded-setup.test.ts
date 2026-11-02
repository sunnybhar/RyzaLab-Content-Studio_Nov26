import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialState,DEMO_ACTOR} from '../lib/studio/seed';
import {saveBoundedWorkflowSetup} from '../lib/studio/bounded-workflow-setup';
import {claudeUsage,usageCost} from '../lib/studio/usage-cost';
import {inspectClaudeModelBounds} from '../lib/studio/model-discovery';
import type {Job} from '../lib/studio/types';
test('plain Claude setup works without native search and preserves founder budgets and overrides',async()=>{
 const s=initialState(DEMO_ACTOR,true);s.connections.push({id:'writing',title:'Writing',provider:'anthropic',function:'text',model:'claude-sonnet-5-5',hasKey:true,status:'unverified',updatedAt:'before'});
 const cap=await inspectClaudeModelBounds('claude-sonnet-5-5','fixture',async()=>Response.json({id:'claude-sonnet-5-5',max_input_tokens:1000000,max_tokens:128000}));
 assert.equal(cap.webSearchSupported,false);
 const before=structuredClone(s.settings),next=saveBoundedWorkflowSetup(s,DEMO_ACTOR,{connectionId:'writing',expectedVersion:s.version},cap,'2026-11-02T12:00:00Z');
 assert.deepEqual(next.settings.reviewPolicy,before.reviewPolicy);assert.equal(next.settings.monthlyCap,before.monthlyCap);assert.equal(next.settings.requestCap,before.requestCap);
 assert.deepEqual(next.connections.at(-1)?.supportedFunctions,['text','ideas','review']);assert.equal(next.settings.qualifiedRates?.filter(r=>r.model==='claude-sonnet-5-5').length,3);
 const card=next.settings.qualifiedRates!.find(r=>r.function==='text')!;
 const j={kind:'text',reserved:16,pricingSnapshot:{...card,inputBytes:10000,quoteVersion:'v1'}} as Job;
 assert.equal(usageCost(j,claudeUsage({input_tokens:10000,output_tokens:1000})!),3);
 assert.equal(usageCost(j,claudeUsage({input_tokens:10000,output_tokens:1000,cache_read_input_tokens:50})!),undefined);
 assert.equal(claudeUsage({input_tokens:-1,output_tokens:1}),undefined);
});
