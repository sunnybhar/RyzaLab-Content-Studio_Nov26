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

test("credential clearing and lifecycle metadata commit atomically; stale clearing cannot erase a newer key", async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261027_studio_v2.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const s = initialState(DEMO_ACTOR, true);
    s.connections.push({
      id: "key-test",
      title: "Local test only",
      provider: "anthropic",
      function: "ideas",
      model: "model",
      hasKey: true,
      status: "validated",
      updatedAt: "2026-10-28T12:00:00Z",
    });
    await db.query("select studio_commit(-1,$1::jsonb,$2::jsonb)", [
      JSON.stringify(s),
      JSON.stringify({ id: "key-test", ciphertext: "test-cipher-before" }),
    ]);
    const next = structuredClone(s);
    next.version++;
    next.connections[0].hasKey = false;
    next.connections[0].status = "disconnected";
    await db.query("select studio_commit($1,$2::jsonb,$3::jsonb)", [
      s.version,
      JSON.stringify(next),
      JSON.stringify({
        id: "key-test",
        ciphertext: "test-encrypted-empty-tombstone",
      }),
    ]);
    const result = await db.query<{ ciphertext: string }>(
      "select ciphertext from studio_secrets where id=$1",
      ["key-test"],
    );
    assert.equal(result.rows[0].ciphertext, "test-encrypted-empty-tombstone");
    await assert.rejects(
      () =>
        db.query("select studio_commit($1,$2::jsonb,$3::jsonb)", [
          s.version,
          JSON.stringify(next),
          JSON.stringify({ id: "key-test", ciphertext: "stale-secret-write" }),
        ]),
      /studio_version_conflict/,
    );
    const retained = await db.query<{ ciphertext: string }>(
      "select ciphertext from studio_secrets where id=$1",
      ["key-test"],
    );
    assert.equal(retained.rows[0].ciphertext, "test-encrypted-empty-tombstone");
  } finally {
    await db.close();
  }
});

test("composed policy, idea selection and automatic writing persist as one real PostgreSQL CAS", async () => {
  const { persist } = await import("../lib/studio/store");
  const { applyCommand } = await import("../lib/studio/engine");
  const { orchestrateInitialWriting } =
    await import("../lib/studio/writing-orchestration");
  const db = new PGlite();
  const now = "2026-10-30T12:00:00Z";
  try {
    await db.exec(bootstrap);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261027_studio_v2.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const original = initialState(DEMO_ACTOR, true);
    original.ideas.unshift({
      ...original.ideas[0],
      id: "composed-idea",
      title: "New composed idea",
      state: "pending",
    });
    const workflow = original.workflows.find(
      (w) => w.channel === original.ideas[0].channel && w.status === "active",
    )!;
    original.connections.push({
      id: "composed-writer",
      title: "Local test writer",
      provider: "anthropic",
      model: "local-test",
      function: "text",
      hasKey: true,
      status: "validated",
      updatedAt: now,
      ...{ maxRequestCost: 50 },
    });
    workflow.functionConnections = {
      ...workflow.functionConnections,
      text: "composed-writer",
    };
    original.settings.qualifiedRates = [
      {
        provider: "anthropic",
        model: "local-test",
        function: "text",
        currency: "USD",
        inputCentsPerMillion: 100,
        outputCentsPerMillion: 500,
        maxInputBytes: 500000,
        maxOutputTokens: 1000,
        source: "https://example.com/prices",
        verifiedAt: "2026-10-29",
        qualified: true,
      },
    ];
    await db.query("select public.studio_commit(-1,$1::jsonb)", [
      JSON.stringify(original),
    ]);
    let next = applyCommand(
      original,
      DEMO_ACTOR,
      {
        type: "policy.adoptSolo",
        expectedRuleVersion: original.settings.protectedVersion,
        packageCap: 50,
        monthlyCap: 500,
        requireIndependentReview: false,
        autoDraft: true,
        autoReview: true,
      },
      { now },
    );
    next = applyCommand(
      next,
      DEMO_ACTOR,
      {
        type: "idea.use",
        id: "composed-idea",
        format: "Text post",
        account: "RyzaLab",
      },
      { now },
    );
    next = orchestrateInitialWriting(next, now);
    assert.ok(next.version > 1);
    assert.equal(next.jobs.length, 1);
    const adapter = {
      rpc: async (
        _name: string,
        args: {
          p_expected_version: number;
          p_state: unknown;
          p_secret: unknown;
        },
      ) => {
        try {
          await db.query(
            "select public.studio_commit($1,$2::jsonb,$3::jsonb)",
            [
              args.p_expected_version,
              JSON.stringify(args.p_state),
              args.p_secret === null ? null : JSON.stringify(args.p_secret),
            ],
          );
          return { error: null };
        } catch (error) {
          return { error: error as { code: string } };
        }
      },
    } as unknown as Parameters<typeof persist>[0];
    await persist(adapter, original, next);
    assert.equal(next.version, 1);
    const saved = await db.query<{ state: typeof next }>(
      "select state from studio_workspace",
    );
    assert.equal(saved.rows[0].state.jobs.length, 1);
    assert.ok(saved.rows[0].state.jobs[0].reserved > 0);
    assert.equal(original.jobs.length, 0);
    await assert.rejects(
      () => persist(adapter, original, structuredClone(next)),
      /concurrently/,
    );
    const final = await db.query<{ state: typeof next }>(
      "select state from studio_workspace",
    );
    assert.equal(final.rows[0].state.jobs.length, 1);
  } finally {
    await db.close();
  }
});
