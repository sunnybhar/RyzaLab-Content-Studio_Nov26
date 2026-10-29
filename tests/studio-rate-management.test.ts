import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, DEMO_ACTOR } from '../lib/studio/seed';
import { updateRates } from '../lib/studio/rate-management';
import { effectiveRates, quote, pricingSnapshotIsCurrent, readRates, type Rate } from '../lib/studio/pricing';
const now='2026-10-29T12:00:00Z';
const card: Rate={provider:'anthropic',model:'test-model',function:'text',currency:'USD',inputCentsPerMillion:200,outputCentsPerMillion:1000,maxInputBytes:50000,maxOutputTokens:3000,source:'https://example.com/prices',verifiedAt:'2026-10-28',qualified:true};
const change={action:'save',expectedVersion:0,card,evidence:'Reviewed provider price and output limits against evaluated adapter.'};
test('only authorized settings managers qualify prices; server assigns immutable version and author',()=>{
 const s=initialState(DEMO_ACTOR,true);const viewer={id:'viewer',email:'viewer@example.com'};s.members.push({...viewer,roles:['viewer'],grants:[],revoked:false});
 assert.throws(()=>updateRates(s,viewer,change,[],now,'v1'),/permission/);
 const next=updateRates(s,DEMO_ACTOR,change,[],now,'v1');
 assert.equal(next.settings.pricingRegistryVersion,1);assert.equal(next.settings.qualifiedRates![0].qualifiedBy,DEMO_ACTOR.email);assert.equal(next.settings.qualifiedRates![0].registryVersion,'v1');
 assert.equal(s.settings.qualifiedRates,undefined);
 assert.throws(()=>updateRates(next,DEMO_ACTOR,change,[],now,'v2'),/Pricing changed/);
 assert.throws(()=>updateRates(s,DEMO_ACTOR,{...change,card:{...card,qualifiedBy:'forged'}},[],now,'v2'));
});
test('workspace registry preserves inherited entries and updated quotes invalidate only changed snapshots',()=>{
 let s=initialState(DEMO_ACTOR,true);
 const other={...card,model:'other'};
 s=updateRates(s,DEMO_ACTOR,change,[other],now,'v1');
 assert.equal(effectiveRates(s).length,2);
 s.connections.push({id:'configured',title:'Configured model',provider:'anthropic',model:'test-model',function:'text',hasKey:true,status:'validated',updatedAt:now});
 const request={channel:'LinkedIn',kind:'text',connectionId:'configured',prompt:'Write a selected piece'};
 const frozen=quote(s,request).pricingSnapshot;
 assert.ok(pricingSnapshotIsCurrent(frozen,effectiveRates(s)));
 s=updateRates(s,DEMO_ACTOR,{...change,expectedVersion:1,card:{...card,outputCentsPerMillion:1100}},effectiveRates(s),now,'v2');
 assert.equal(pricingSnapshotIsCurrent(frozen,effectiveRates(s)),false);
 s=updateRates(s,DEMO_ACTOR,{action:'remove',expectedVersion:2,provider:card.provider,model:card.model,function:card.function},effectiveRates(s),now,'v3');
 assert.throws(()=>quote(s,request),/No qualified/);
 assert.deepEqual(effectiveRates(s),[other]);
});
test('qualification rejects unsupported adapters, invalid sources, future dates and missing evidence',()=>{
 const s=initialState(DEMO_ACTOR,true);
 for(const replacement of [{function:'video'},{source:'http://example.com'},{verifiedAt:'2099-01-01'},{verifiedAt:'invalid'},{source:'https://user:secret@example.com'},{inputCentsPerMillion:0,outputCentsPerMillion:0}])
 assert.throws(()=>updateRates(s,DEMO_ACTOR,{...change,card:{...card,...replacement}},[],now,'v1'));
 assert.throws(()=>updateRates(s,DEMO_ACTOR,{...change,evidence:''},[],now,'v1'));
 assert.throws(()=>readRates('{invalid'),/registry is invalid/);
});
