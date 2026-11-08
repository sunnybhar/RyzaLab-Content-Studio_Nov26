import {test} from "node:test";import assert from "node:assert/strict";import {readFile} from "node:fs/promises";import {PGlite} from "@electric-sql/pglite";import {initialState,DEMO_ACTOR} from "../lib/studio/seed";
const bootstrap = `create role anon; create role authenticated; create role service_role; create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table public.members(email text,role text,revoked_at timestamptz);create table public.drafts(id uuid);create table public.campaigns(id uuid);`;

test("optimized history commit keeps immutable evidence, permissions, versions and atomic secrets",async()=>{
 const db=new PGlite();
 try{
 await db.exec(bootstrap);await db.exec(await readFile(new URL('../supabase/migrations/20261027_studio_v2.sql',import.meta.url),'utf8'));
 const s=initialState(DEMO_ACTOR,true);s.packages=[{id:"approved-package",text:"Original immutable package"} as any];s.audit=Array.from({length:600},(_,i)=>({id:'history-'+i,actor:DEMO_ACTOR.email,action:'fixture',target:'workspace',at:'2026-11-08T02:00:00Z'}));
 await db.query('select public.studio_commit(-1,$1::jsonb)',[JSON.stringify(s)]);
 const first={...structuredClone(s),version:1};first.audit.push({...s.audit[0],id:'new-history-1'});
 const before=performance.now();await db.query('select public.studio_commit(0,$1::jsonb)',[JSON.stringify(first)]);const originalMs=performance.now()-before;
 await db.exec(await readFile(new URL('../supabase/migrations/20261108_studio_commit_history_performance.sql',import.meta.url),'utf8'));
 const next={...structuredClone(first),version:2};next.audit.push({...s.audit[0],id:'new-history-2'});
 const optimizedStart=performance.now();await db.query('select public.studio_commit(1,$1::jsonb,$2::jsonb)',[JSON.stringify(next),JSON.stringify({id:'test-credential',ciphertext:'retained-fixture'})]);const optimizedMs=performance.now()-optimizedStart;
 console.log('Commit history fixture timings (600 records, local PostgreSQL WASM)',{originalMs:Math.round(originalMs),optimizedMs:Math.round(optimizedMs)});
 assert.equal((await db.query<{n:number}>('select count(*)::int n from studio_audit')).rows[0].n,602);
 for(const change of ['mutate','remove','duplicate','add-field']){const bad={...structuredClone(next),version:3};if(change==='mutate')bad.audit[0].action='changed';if(change==='remove')bad.audit.shift();if(change==='duplicate')bad.audit.push({...bad.audit[0]});if(change==='add-field')(bad.audit[0] as any).extra='changed';await assert.rejects(()=>db.query('select public.studio_commit(2,$1::jsonb,$2::jsonb)',[JSON.stringify(bad),JSON.stringify({id:'test-credential',ciphertext:'must-rollback'})]),/mutate|Duplicate/);}
 for(const change of ['mutate','remove','duplicate']){const bad={...structuredClone(next),version:3};if(change==='mutate')bad.packages[0].text='Changed';if(change==='remove')bad.packages=[];if(change==='duplicate')bad.packages.push({...bad.packages[0]});await assert.rejects(()=>db.query('select public.studio_commit(2,$1::jsonb)',[JSON.stringify(bad)]),/mutate|Duplicate/);}
 assert.equal((await db.query<{ciphertext:string}>("select ciphertext from studio_secrets where id='test-credential'")).rows[0].ciphertext,'retained-fixture');
 await assert.rejects(()=>db.query('select public.studio_commit(1,$1::jsonb)',[JSON.stringify({...next,version:3})]),/studio_version_conflict/);
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select public.studio_commit(2,$1::jsonb)',[JSON.stringify({...next,version:3})]),/permission denied/);await db.exec('reset role');
 assert.equal((await db.query<{version:number}>('select version from studio_workspace')).rows[0].version,2);
 }finally{await db.close();}
});
