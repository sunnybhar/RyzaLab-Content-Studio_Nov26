import { test } from "node:test";
import assert from "node:assert/strict";
import { extractResearchResult } from "../lib/studio/research";
import { runProvider } from "../lib/studio/providers";
import {
  readRates,
  pricingSnapshotIsCurrent,
  type Rate,
} from "../lib/studio/pricing";
import type { Job, Connection } from "../lib/studio/types";
const rate: Rate = {
  provider: "anthropic",
  model: "qualified-test-model",
  function: "research",
  currency: "USD",
  inputCentsPerMillion: 200,
  outputCentsPerMillion: 1000,
  maxInputBytes: 5000,
  maxOutputTokens: 1000,
  fixedCents: 100,
  webSearchTool: "web_search_20250305",
  maxSearchUses: 1,
  source: "https://example.com/qualified-test-only",
  verifiedAt: "2026-10-28",
  qualified: true,
};
const response = {
  stop_reason: "end_turn",
  content: [
    { type: "server_tool_use", name: "web_search", id: "search1" },
    {
      type: "web_search_tool_result",
      tool_use_id: "search1",
      content: [
        {
          type: "web_search_result",
          url: "https://example.com/source",
          title: "Source",
        },
      ],
    },
    {
      type: "text",
      text: "A sourced finding requiring human review.",
      citations: [
        {
          type: "web_search_result_location",
          url: "https://example.com/source",
          title: "Source",
          cited_text: "Exact cited words",
        },
      ],
    },
  ],
};
test("research retains actual citation provenance and never invents cited access", () => {
  const result = extractResearchResult(response);
  assert.equal(result.status, "cited_research");
  assert.deepEqual(result.citations, [
    {
      url: "https://example.com/source",
      title: "Source",
      citedText: "Exact cited words",
    },
  ]);
  assert.equal(
    extractResearchResult({
      content: [{ type: "text", text: "Uncited claim" }],
    }).status,
    "needs_source_review",
  );
  const unsafe = extractResearchResult({
    content: [
      {
        type: "text",
        text: "Untrusted HTML",
        citations: [
          {
            type: "web_search_result_location",
            url: "javascript:alert(1)",
            title: "bad",
          },
        ],
      },
    ],
  });
  assert.equal(unsafe.citations.length, 0);
});
test("pricing snapshot detects changed rates and optional fixed-price removal even with unchanged verification date", () => {
  const rates = readRates(JSON.stringify([rate]));
  const snapshot = { ...rate, inputBytes: 100, quoteVersion: "v1" };
  assert.equal(pricingSnapshotIsCurrent(snapshot, rates), true);
  assert.equal(
    pricingSnapshotIsCurrent(snapshot, [{ ...rates[0], fixedCents: 200 }]),
    false,
  );
  const { fixedCents: _, ...removed } = rates[0];
  assert.equal(pricingSnapshotIsCurrent(snapshot, [removed]), false);
});
test("Claude research sends a single bounded search only with qualified snapshot and retains citations", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(body.tools, [
      { type: "web_search_20250305", name: "web_search", max_uses: 1 },
    ]);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const job = {
      id: "test",
      kind: "research",
      prompt: "Find cited evidence",
      pricingSnapshot: rate,
    } as unknown as Job;
    const connection = {
      provider: "anthropic",
      model: rate.model,
    } as Connection;
    const outcome = await runProvider(
      job,
      connection,
      "local-test-key-not-real",
    );
    assert.equal(JSON.parse(outcome.text!).status, "cited_research");
    assert.equal(calls, 1);
    await assert.rejects(
      () =>
        runProvider(
          {
            ...job,
            pricingSnapshot: { ...rate, fixedCents: undefined },
          } as Job,
          connection,
          "not-real",
        ),
      /not qualified/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("search tool errors remain needs-review with no fabricated citations", () => {
  const result = extractResearchResult({
    stop_reason: "end_turn",
    content: [
      { type: "server_tool_use", name: "web_search" },
      {
        type: "web_search_tool_result",
        content: [
          {
            type: "web_search_tool_result_error",
            error_code: "search_unavailable",
          },
        ],
      },
      { type: "text", text: "Cannot search." },
    ],
  });
  assert.equal(result.status, "needs_source_review");
  assert.deepEqual(result.errors, ["search_unavailable"]);
});

test("saved cited research becomes a reference once without spending or activating workflows", async () => {
  const { initialState, DEMO_ACTOR } = await import("../lib/studio/seed");
  const { applyCommand } = await import("../lib/studio/engine");
  const s = initialState(DEMO_ACTOR, true);
  const result = JSON.stringify(extractResearchResult(response));
  s.jobs.push({
    id: "research-done",
    kind: "research",
    channel: "LinkedIn",
    connectionId: "qualified-research",
    prompt: "Past request",
    estimate: 100,
    reserved: 100,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: "past",
    createdBy: DEMO_ACTOR.email,
    createdAt: "2026-10-28T12:00:00Z",
    result,
  });
  const command = {
    type: "research.saveReference",
    jobId: "research-done",
    title: "Research evidence to review",
  };
  const next = applyCommand(s, DEMO_ACTOR, command, { demo: true });
  assert.equal(
    next.references.filter((r) => r.sourceJobId === "research-done").length,
    1,
  );
  assert.deepEqual(next.workflows, s.workflows);
  assert.deepEqual(next.jobs, s.jobs);
  assert.deepEqual(
    applyCommand(next, DEMO_ACTOR, command, { demo: true }),
    next,
  );
});

test("truncated/refused/paused research and object-shaped tool errors cannot become accepted references", () => {
  for (const stop_reason of [
    "max_tokens",
    "pause_turn",
    "refusal",
    undefined,
  ]) {
    const result = extractResearchResult({ ...response, stop_reason });
    assert.equal(result.status, "needs_source_review");
    assert.ok(result.errors.length);
  }
  const result = extractResearchResult({
    ...response,
    content: [
      ...response.content,
      {
        type: "web_search_tool_result",
        content: {
          type: "web_search_tool_result_error",
          error_code: "unavailable",
        },
      },
    ],
  });
  assert.equal(result.status, "needs_source_review");
  assert.ok(result.errors.includes("unavailable"));
  assert.ok(
    result.citations.length,
    "provenance remains visible for human inspection",
  );
});
