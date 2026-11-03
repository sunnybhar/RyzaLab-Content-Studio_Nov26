import {test} from 'node:test';import assert from 'node:assert/strict';import {loadState} from '../lib/studio/store';import {DEMO_ACTOR} from '../lib/studio/seed';import {readStudioResponse} from '../lib/studio/response';
test('database read failures distinguish missing schema, timeout and permissions without initializing or resetting state',async()=>{
 for(const [code,message,expected] of [['57014','canceling statement due to statement timeout',/timed out/],['PGRST205','table not found',/schema is missing/],['42501','permission denied',/access was denied/],['08006','connection lost',/temporarily unavailable/]] as const){let writes=0;const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:{code,message}})})})}),rpc:async()=>{writes++;return{error:null};}} as unknown as Parameters<typeof loadState>[0];
 await assert.rejects(()=>loadState(db,DEMO_ACTOR),(error:unknown)=>{assert.match((error as Error).message,expected);if(code!=='PGRST205')assert.doesNotMatch((error as Error).message,/Apply supabase\/migrations/);return true;});assert.equal(writes,0);
 }
});
test('plain-text server timeouts become actionable uncertainty errors with no retry or successful result',async()=>{
 await assert.rejects(()=>readStudioResponse(new Response('Vercel Runtime Timeout Error',{status:504})),/server timed out before the outcome was confirmed/);
 await assert.rejects(()=>readStudioResponse(Response.json({error:'The Studio database read timed out.',trace:'safe-reference'},{status:503})),/read timed out.*safe-reference/);
 assert.deepEqual(await readStudioResponse(Response.json({state:{version:1}})),{state:{version:1}});
});
