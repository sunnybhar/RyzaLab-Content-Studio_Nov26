import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_ACTOR} from '../lib/studio/seed';
import {applyCommand} from '../lib/studio/engine';
import {researchAnalysisInput,researchAnalysisReplay} from '../lib/studio/research-analysis';
import {applyWorkerReceipt,LEASE_EXPIRED_ERROR} from '../lib/studio/worker-receipt';
import {researchEvidence} from '../lib/studio/research-link';
import {canDispatchJob} from '../lib/studio/dispatch-permissions';
import {filteredState} from '../lib/studio/permissions';
import {eligibleEvidence} from '../lib/studio/source-policy';
import {ideaJobInput} from '../lib/studio/idea-generation';
import {generationInput} from '../lib/studio/generation';
import {quote} from '../lib/studio/pricing';
import {dossierState,queuedAnalysis,dossierResponse,now,sources} from './fixtures/research-dossier';
function settle(){const f=queuedAnalysis();f.state.jobs[0].state='running';f.state.jobs[0].leaseId='analysis-lease';return {...f,state:applyWorkerReceipt(f.state,{version:1,jobId:f.state.jobs[0].id,leaseId:'analysis-lease',receivedAt:now,outcome:{text:JSON.stringify(dossierResponse()),completion:'complete'}})};}
test('canonical analysis freezes qualified contract/evidence, reserves once and rejects generic enqueue forgery',()=>{
 const {state,command,priced}=queuedAnalysis(),j=state.jobs[0];assert.equal(j.outputContract,'research_v1');assert.equal(j.reserved,priced.cost);assert.equal(j.researchSnapshots?.[0].jobId,command.researchJobId);assert.match(j.systemSnapshot!,/RESEARCH DOSSIER ONLY/);assert.equal(canDispatchJob(state,DEMO_ACTOR,j),true);
 const fresh=dossierState();const input=researchAnalysisInput(fresh,DEMO_ACTOR,{...command,researchJobId:fresh.jobs[0].id});
 assert.throws(()=>applyCommand(fresh,DEMO_ACTOR,input,{quotedCost:priced.cost}),/canonical/);
});
test('lost-response replay returns exact saved analysis even after pricing changes, with no extra reservation',()=>{
 const {state,command}=queuedAnalysis();state.settings.qualifiedRates=[];
 assert.equal(researchAnalysisReplay(state,DEMO_ACTOR,command),true);assert.equal(applyCommand(state,DEMO_ACTOR,command),state);
 assert.throws(()=>researchAnalysisReplay(state,DEMO_ACTOR,{...command,channel:'Reddit'}),/different operation/);
 assert.throws(()=>researchAnalysisInput(state,DEMO_ACTOR,{...command,idempotencyKey:'another'}),/pending or uncertain/);
});
test('analysis obeys maximum, request/monthly budgets and source/membership permissions',()=>{
 const state=dossierState(),input={channel:'LinkedIn' as const,researchJobId:state.jobs[0].id,idempotencyKey:'a',maximum:1};
 assert.throws(()=>researchAnalysisInput(state,DEMO_ACTOR,input),/maximum/);
 const canonical=researchAnalysisInput(state,DEMO_ACTOR,{...input,maximum:50}),priced=quote(state,canonical);
 assert.throws(()=>applyCommand(state,DEMO_ACTOR,{...canonical,estimate:1},{researchAnalysis:true,quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot}),/confirmed maximum/);
 state.settings.monthlyCap=1;assert.throws(()=>applyCommand(state,DEMO_ACTOR,canonical,{researchAnalysis:true,quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot}),/budget|cap|allowance/i);
 state.members.find(m=>m.email===DEMO_ACTOR.email)!.revoked=true;assert.throws(()=>researchAnalysisInput(state,DEMO_ACTOR,{...input,maximum:50}),/permission|membership|allowed/i);
});
test('worker saves dossier without touching drafts/packages, retains incomplete output and reconciles exact expired lease once',()=>{
 const {state}=queuedAnalysis(),j=state.jobs[0],before=structuredClone({contents:state.contents,packages:state.packages});j.state='unknown';j.error=LEASE_EXPIRED_ERROR;j.leaseId='expired';
 const receipt={version:1 as const,jobId:j.id,leaseId:'expired',receivedAt:now,outcome:{text:JSON.stringify(dossierResponse()),completion:'complete' as const}};
 const next=applyWorkerReceipt(state,receipt);assert.equal(next.jobs[0].outputStatus,'ready');assert.equal(next.jobs[0].researchDossier?.calculationResults[0].value,20);assert.deepEqual({contents:next.contents,packages:next.packages},before);assert.equal(applyWorkerReceipt(next,receipt),next);assert.equal(next.jobs[0].reserved,j.reserved);
 const incomplete=applyWorkerReceipt(state,{...receipt,outcome:{...receipt.outcome,completion:'incomplete'}});assert.equal(incomplete.jobs[0].outputStatus,'invalid');assert.equal(incomplete.jobs[0].result,receipt.outcome.text);assert.equal(incomplete.jobs.length,state.jobs.length);
 const invalid=applyWorkerReceipt(state,{...receipt,outcome:{text:'{"version":1}',completion:'complete'}});assert.equal(invalid.jobs[0].outputStatus,'invalid');assert.ok(invalid.jobs[0].error);
});
test('eligible dossier reaches ideas and writing; changed source prevents reuse and provider disclosure',()=>{
 const {state,command}=settle();const evidence=researchEvidence(state,DEMO_ACTOR,'LinkedIn',[command.researchJobId])[0];assert.equal(evidence.dossier?.calculationResults[0].value,20);
 const ideas=ideaJobInput(state,DEMO_ACTOR,{channel:'LinkedIn',topic:'Installation changes',audience:'Households',quantity:1,research:true,researchJobIds:[command.researchJobId],sourceText:'',idempotencyKey:'ideas'});
 assert.equal(JSON.parse(ideas.prompt).webEvidence[0].dossier.calculationResults[0].value,20);
 const content=state.contents.find(c=>c.channel==='LinkedIn')!;
 const writing=generationInput(state,DEMO_ACTOR,{contentId:content.id,kind:'text',expectedRevision:content.revision,researchJobIds:[command.researchJobId],idempotencyKey:'writing'});
 assert.equal(JSON.parse(writing.prompt).webEvidence[0].dossier.claims[0].evidence[0].sourceId,'s1');
 state.jobs.find(j=>j.id===command.researchJobId)!.result=state.jobs.find(j=>j.id===command.researchJobId)!.result!.replace('120','130');
 assert.equal(researchEvidence(state,DEMO_ACTOR,'LinkedIn',[command.researchJobId])[0].dossier,undefined);assert.equal(canDispatchJob(state,DEMO_ACTOR,state.jobs[0]),false);
});
test('excluded historical dossier sources and permission loss cannot leak through new evidence or filtered state',()=>{
 const {state,command}=settle(),dossier=state.jobs[0].researchDossier!;
 const excluded={...sources[0],url:'https://en.wikipedia.org/wiki/Study'};const cleaned=eligibleEvidence([{citations:[excluded,sources[0]],dossier:{...dossier,sources:[excluded]}}])[0];assert.equal(cleaned.dossier?.claims.length,0);assert.equal(dossier.claims.length,1);
 const analysis=state.jobs[0];analysis.prompt=JSON.stringify({sources:[excluded]});assert.equal(canDispatchJob(state,DEMO_ACTOR,analysis),false);
 const member=state.members.find(m=>m.email===DEMO_ACTOR.email)!;member.roles=['creator'];member.grants=[{action:'read',channel:'Reddit'}];
 assert.equal(filteredState(state,DEMO_ACTOR).jobs.some(j=>j.id===analysis.id),false);assert.throws(()=>researchAnalysisInput(state,DEMO_ACTOR,{...command,idempotencyKey:'denied'}),/permission|allowed/i);
});
