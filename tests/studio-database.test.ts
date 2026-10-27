import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const bootstrap = `create role anon; create role authenticated; create role service_role; create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table public.members(email text,role text,revoked_at timestamptz);create table public.drafts(id uuid);create table public.campaigns(id uuid);`;
test("real PostgreSQL migration denies browser writes, atomically CASes, and protects immutable evidence", async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    const migration = await readFile(
      new URL("../supabase/migrations/20261027_studio_v2.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    const original = initialState(DEMO_ACTOR, true);
    await db.query("select public.studio_commit(-1,$1::jsonb)", [
      JSON.stringify(original),
    ]);
    await db.exec("set role authenticated");
    await assert.rejects(
      () => db.query("select * from public.studio_workspace"),
      /permission denied/i,
    );
    await assert.rejects(
      () =>
        db.query("select public.studio_commit(0,$1::jsonb)", [
          JSON.stringify({ ...original, version: 1 }),
        ]),
      /permission denied/i,
    );
    await db.exec("reset role");
    const first = { ...structuredClone(original), version: 1 };
    first.audit.push({
      id: "event1",
      actor: DEMO_ACTOR.email,
      action: "test",
      target: "workspace",
      at: new Date().toISOString(),
    });
    await db.query("select public.studio_commit(0,$1::jsonb)", [
      JSON.stringify(first),
    ]);
    await assert.rejects(
      () =>
        db.query("select public.studio_commit(0,$1::jsonb)", [
          JSON.stringify(first),
        ]),
      /studio_version_conflict/,
    );
    const trimmed = { ...structuredClone(first), version: 2, audit: [] };
    await assert.rejects(
      () =>
        db.query("select public.studio_commit(1,$1::jsonb)", [
          JSON.stringify(trimmed),
        ]),
      /Cannot mutate or remove audit/,
    );
    await assert.rejects(
      () => db.exec("delete from studio_audit where id='event1'"),
      /immutable/i,
    );
    const result = await db.query<{ version: number }>(
      "select version from studio_workspace",
    );
    assert.equal(Number(result.rows[0].version), 1);
  } finally {
    await db.close();
  }
});
