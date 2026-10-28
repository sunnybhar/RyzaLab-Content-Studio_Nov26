// Local-only recovery drill. No remote database URL or production write path.
import {PGlite} from '@electric-sql/pglite';
import {readFile,stat} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {decryptArchive,verifyBackupArchive,hiddenBackupPassword} from './studio-backup.mjs';
export async function restoreDrill(snapshot){
 const db=new PGlite();
 try{await db.exec('create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table members(email text,role text,revoked_at timestamptz);create table drafts(id uuid);create table campaigns(id uuid);');
 await db.exec(await readFile(new URL('../supabase/migrations/20261027_studio_v2.sql',import.meta.url),'utf8'));
 const state=structuredClone(snapshot.state);state.version=0;await db.query('select studio_commit(-1,$1::jsonb)',[JSON.stringify(state)]);
 const counts=await db.query('select (select count(*) from studio_release_packages)::int as packages,(select count(*) from studio_audit)::int as audit');
 if(counts.rows[0].packages!==state.packages.length||counts.rows[0].audit!==state.audit.length)throw new Error('Restored evidence counts differ.');
 for(const asset of snapshot.assets){const m=asset.metadata;await db.query('insert into auth.users(id) values($1) on conflict do nothing',[m.uploaded_by]);await db.query('insert into studio_assets(id,content_id,object_path,uploaded_by,mime,name) values($1,$2,$3,$4,$5,$6)',[m.id,m.content_id,m.object_path,m.uploaded_by,m.mime,m.name]);}
 for(const secret of snapshot.secrets)await db.query('insert into studio_secrets(id,ciphertext) values($1,$2)',[secret.id,secret.ciphertext]);
 return {contents:state.contents.length,packages:counts.rows[0].packages,audit:counts.rows[0].audit,assets:snapshot.assets.length};
 }finally{await db.close();}
}
async function main(){const file=process.argv[2];if(!file)throw new Error('Usage: node scripts/studio-restore-drill.mjs /private/file.rzlbackup');if((await stat(file)).size>200*1024*1024+49)throw new Error('Oversized backup.');const password=await hiddenBackupPassword('Backup passphrase (hidden): ');const snapshot=await verifyBackupArchive(decryptArchive(await readFile(file),password));const result=await restoreDrill(snapshot);console.log(`LOCAL drill passed: ${result.contents} content items, ${result.packages} packages, ${result.audit} audit records and ${result.assets} asset hashes/metadata. Auth identities were stubs. This is not production restore or Auth recovery acceptance.`);}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Local recovery drill failed. No production restore was attempted. Check backup, passphrase and integrity.');process.exitCode=1;});
