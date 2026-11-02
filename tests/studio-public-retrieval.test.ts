import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retrievePublicReferences} from '../lib/studio/public-retrieval';
import {applyCommand} from '../lib/studio/engine';
import {initialState,DEMO_ACTOR} from '../lib/studio/seed';
import {researchEvidence,publicRetrievalTarget} from '../lib/studio/research-link';
const now='2026-11-02T12:00:00Z';
const request:typeof fetch=async(url,init)=>{
 assert.equal(init?.redirect,'error');assert.equal(init?.method,undefined);
 return Response.json(String(url).includes('wikipedia.org')?{query:{pages:{1:{title:'Home automation',extract:'A public reference excerpt about controls and household handoff procedures. '.repeat(4)}}}}:{message:{items:[{title:['Control handoff'],DOI:'10.1000/example',abstract:'<jats:p>A scholarly abstract about system control and maintainable operating procedures. '.repeat(3),published:{'date-parts':[[2025,6]]}}]}});
};
test('bounded references retain provenance and enter the existing evidence flow without paid search setup',async()=>{
 const result=await retrievePublicReferences('household handoff checklist',request,now);
 assert.equal(result.citations.length,2);assert.equal(result.citations[1].publishedAt,'2025-06');assert.equal(result.retrieval.providerChargeCents,0);
 const state=initialState(DEMO_ACTOR,true),command={type:'research.retrieve',channel:'LinkedIn',query:'household handoff checklist',idempotencyKey:'public-1'};
 assert.throws(()=>applyCommand(state,DEMO_ACTOR,command),/Trusted server/);
 const next=applyCommand(state,DEMO_ACTOR,command,{now,retrievalResult:result});
 assert.equal(next.jobs[0].actual,0);assert.equal(researchEvidence(next,DEMO_ACTOR,'LinkedIn',[next.jobs[0].id])[0].version,2);
 assert.equal(applyCommand(next,DEMO_ACTOR,command),next);
 assert.throws(()=>publicRetrievalTarget(next,DEMO_ACTOR,{...command,channel:'LinkedIn',query:'different question'}),/different operation/);
});
test('failure and oversized responses never become usable evidence',async()=>{
 let count=0;
 await assert.rejects(()=>retrievePublicReferences('household checklist',async()=>{count++;return new Response('x'.repeat(65537));}),/No usable public/);
 assert.equal(count,2);
 await assert.rejects(()=>retrievePublicReferences('x',request),/5–2000/);
});
test('partial coverage is explicit and title-only search hits are excluded',async()=>{
 const result=await retrievePublicReferences('handoff checklist',async(url,init)=>String(url).includes('crossref')?Response.json({message:{items:[{title:['No abstract'],DOI:'10.1000/example'}]}}):request(url,init),now);
 assert.equal(result.citations.length,1);assert.match(result.notice,/not unrestricted web/);
});
