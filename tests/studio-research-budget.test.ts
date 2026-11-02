import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectClaudeResearchModel } from "../lib/studio/model-discovery";
import {
  researchReservation,
  validResearchReservation,
  RESEARCH_PRICE,
} from "../lib/studio/research-budget";
import {
  researchSetupPlan,
  saveResearchSetup,
} from "../lib/studio/research-setup";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { quote, pricingSnapshotIsCurrent } from "../lib/studio/pricing";
import { runProvider, ProviderFailure } from "../lib/studio/providers";
import type { Connection, Job } from "../lib/studio/types";
const now = "2026-11-02T15:00:00Z";
const metadata = {
  id: RESEARCH_PRICE.model,
  max_input_tokens: 5000,
  max_tokens: 6000,
  capabilities: { server_tools: { web_search: { supported: true } } },
};
function fixture() {
  let state = initialState(DEMO_ACTOR, true);
  state = applyCommand(
    state,
    DEMO_ACTOR,
    {
      type: "policy.adoptSolo",
      expectedRuleVersion: state.settings.protectedVersion,
      packageCap: 200,
      budgetCategory: "custom",
      monthlyCap: 1000,
      requireIndependentReview: false,
      autoDraft: false,
      autoReview: false,
    },
    { demo: true, now },
  );
  state.settings.requestCap = 200;
  state.settings.qualifiedRates = [];
  const connection: Connection = {
    id: "research-budget",
    provider: "anthropic",
    function: "research",
    model: RESEARCH_PRICE.model,
    title: "Configured research",
    status: "unverified",
    hasKey: true,
    updatedAt: now,
  };
  state.connections.push(connection);
  state.workflows.find(
    (w) => w.channel === "LinkedIn" && w.status === "active",
  )!.functionConnections = { research: connection.id };
  return {
    state,
    connection,
    capability: {
      model: RESEARCH_PRICE.model,
      webSearchSupported: true as const,
      maxInputTokens: 5000,
      maxOutputTokens: 6000,
    },
  };
}
test("Models API inspects capability and bounds via a fixed read-only endpoint and fails closed on unknown data", async () => {
  let calls = 0;
  const request = async (url: RequestInfo | URL, options?: RequestInit) => {
    calls++;
    assert.equal(
      String(url),
      `https://api.anthropic.com/v1/models/${RESEARCH_PRICE.model}`,
    );
    assert.equal(options?.redirect, "error");
    assert.equal(options?.method, undefined);
    return new Response(JSON.stringify(metadata), { status: 200 });
  };
  const capability = await inspectClaudeResearchModel(
    RESEARCH_PRICE.model,
    "synthetic-key",
    request as typeof fetch,
  );
  assert.equal(calls, 1);
  assert.equal(capability.maxInputTokens, 5000);
  assert.equal(capability.webSearchSupported, true);
  for (const value of [
    { ...metadata, capabilities: {} },
    { ...metadata, max_input_tokens: undefined },
    { ...metadata, id: "another-model" },
    { ...metadata, max_tokens: 0 },
  ])
    await assert.rejects(
      () =>
        inspectClaudeResearchModel(
          RESEARCH_PRICE.model,
          "do-not-expose-key",
          async () => new Response(JSON.stringify(value), { status: 200 }),
        ),
      (error) => !String(error).includes("do-not-expose-key"),
    );
});
test("reservation uses the full input envelope across possible output-bounded continuations, rounded upward", () => {
  assert.equal(researchReservation(5000, 128).cents, 131);
  assert.equal(researchReservation(1000000, 256).cents, 51402);
  assert.equal(researchReservation(1000000, 3000).cents, 600204);
  assert.throws(() => researchReservation(5000, 0));
  assert.throws(() => researchReservation(5000, 1.5));
  assert.throws(() => researchReservation(Infinity, 256));
  assert.equal(
    validResearchReservation({
      provider: "anthropic",
      function: "research",
      fixedCents: 50,
      webSearchTool: "web_search_20250305",
      maxSearchUses: 1,
    }),
    false,
  );
});
test("automatic setup refuses over-cap reservations without changing monthly or package settings", () => {
  const { state, connection, capability } = fixture();
  const snapshot = structuredClone(state);
  const big = { ...capability, maxInputTokens: 1000000 };
  const plan = researchSetupPlan(state, connection, big, 256, 200);
  assert.equal(plan.fitsPackage, false);
  assert.equal(plan.cents, 51402);
  assert.throws(
    () =>
      saveResearchSetup(
        state,
        DEMO_ACTOR,
        {
          connectionId: connection.id,
          expectedUpdatedAt: now,
          expectedVersion: state.version,
          expectedPricingVersion: 0,
          outputTokens: 256,
          packageCap: 200,
        },
        big,
        now,
        "save",
      ),
    /exceeds/,
  );
  assert.deepEqual(state, snapshot);
});
test("fit setup records calculated rates and model capability atomically without changing package/month budgets or starting AI", () => {
  const { state, connection, capability } = fixture();
  const saved = saveResearchSetup(
    state,
    DEMO_ACTOR,
    {
      connectionId: connection.id,
      expectedUpdatedAt: now,
      expectedVersion: state.version,
      expectedPricingVersion: 0,
      outputTokens: 128,
      packageCap: 200,
    },
    capability,
    now,
    "save",
  );
  assert.equal(saved.settings.monthlyCap, state.settings.monthlyCap);
  assert.deepEqual(saved.settings.reviewPolicy, state.settings.reviewPolicy);
  assert.deepEqual(saved.jobs, state.jobs);
  const c = saved.connections.find((c) => c.id === connection.id)!;
  assert.equal(c.status, "validated");
  assert.equal(c.researchCapability?.maxInputTokens, 5000);
  const card = saved.settings.qualifiedRates![0];
  assert.equal(card.fixedCents, 131);
  assert.equal(validResearchReservation(card), true);
  assert.equal(
    quote(saved, {
      kind: "research",
      channel: "LinkedIn",
      connectionId: c.id,
      prompt: "Public research question",
    }).cost,
    131,
  );
  c.updatedAt = "2026-11-02T15:00:01Z";
  assert.throws(
    () =>
      quote(saved, {
        kind: "research",
        channel: "LinkedIn",
        connectionId: c.id,
        prompt: "Public research question",
      }),
    /capability check/,
  );
  const { researchBudget: _, ...legacy } = card;
  assert.equal(
    pricingSnapshotIsCurrent(
      { ...legacy, inputBytes: 100, quoteVersion: "v1" },
      [card],
    ),
    false,
  );
});
test("stale or unprivileged setup changes reject without writes", () => {
  const { state, connection, capability } = fixture();
  const command = {
    connectionId: connection.id,
    expectedUpdatedAt: now,
    expectedVersion: state.version,
    expectedPricingVersion: 0,
    outputTokens: 128,
    packageCap: 200,
  };
  assert.throws(
    () =>
      saveResearchSetup(
        state,
        DEMO_ACTOR,
        { ...command, expectedVersion: state.version - 1 },
        capability,
        now,
        "stale",
      ),
    /Workspace changed/,
  );
  state.members.find((m) => m.email === DEMO_ACTOR.email)!.roles = ["creator"];
  assert.throws(
    () =>
      saveResearchSetup(state, DEMO_ACTOR, command, capability, now, "denied"),
    /permission/,
  );
});
test("dispatch rechecks model support before any paid messages call and rejects changed context bounds", async () => {
  const { state, connection, capability } = fixture();
  const saved = saveResearchSetup(
    state,
    DEMO_ACTOR,
    {
      connectionId: connection.id,
      expectedUpdatedAt: now,
      expectedVersion: state.version,
      expectedPricingVersion: 0,
      outputTokens: 128,
      packageCap: 200,
    },
    capability,
    now,
    "save",
  );
  const card = saved.settings.qualifiedRates![0],
    original = globalThis.fetch;
  let messages = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/messages")) messages++;
    return new Response(
      JSON.stringify({ ...metadata, max_input_tokens: 1000000 }),
      { status: 200 },
    );
  };
  try {
    await assert.rejects(
      () =>
        runProvider(
          {
            kind: "research",
            prompt: "Public question",
            pricingSnapshot: card,
          } as Job,
          saved.connections.find((c) => c.id === connection.id)!,
          "fixture",
        ),
      (error) => error instanceof ProviderFailure && !error.ambiguous,
    );
    assert.equal(messages, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("named categories and custom 160 cents preserve founder monthly choice and enforce the two-dollar ceiling", () => {
  const { state } = fixture();
  const base = {
    type: "policy.adoptSolo",
    expectedRuleVersion: state.settings.protectedVersion,
    expectedPolicyVersion: state.settings.reviewPolicy!.version,
    monthlyCap: 777,
    requireIndependentReview: false,
    autoDraft: false,
    autoReview: false,
  };
  const changed = applyCommand(
    state,
    DEMO_ACTOR,
    { ...base, packageCap: 160, budgetCategory: "custom" },
    { demo: true, now },
  );
  assert.equal(changed.settings.monthlyCap, 777);
  assert.equal(changed.settings.reviewPolicy?.packageCap, 160);
  assert.throws(
    () =>
      applyCommand(
        state,
        DEMO_ACTOR,
        { ...base, packageCap: 201, budgetCategory: "custom" },
        { demo: true, now },
      ),
    /maximum total package/,
  );
  assert.throws(
    () =>
      applyCommand(
        state,
        DEMO_ACTOR,
        { ...base, packageCap: 160, budgetCategory: "short_text" },
        { demo: true, now },
      ),
    /Use Custom/,
  );
  const existing = structuredClone(state);
  existing.settings.reviewPolicy!.packageCap = 1000;
  assert.throws(
    () =>
      applyCommand(
        existing,
        DEMO_ACTOR,
        {
          type: "preparation.authorize",
          contentId: existing.contents[0].id,
          expectedRevision: existing.contents[0].revision,
          maxCents: 201,
        },
        { demo: true, now },
      ),
    /package cap/,
  );
});
