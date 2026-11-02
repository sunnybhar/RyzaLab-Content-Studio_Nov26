import { test } from "node:test";
import assert from "node:assert/strict";
import {
  claudeUsage,
  usageCost,
  settleUsageCost,
} from "../lib/studio/usage-cost";
import type { Job, Connection } from "../lib/studio/types";
import { runProvider } from "../lib/studio/providers";
function job(): Job {
  return {
    id: "cost-job",
    kind: "text",
    channel: "LinkedIn",
    prompt: "General guidance from supplied references only.",
    connectionId: "writing",
    estimate: 16,
    reserved: 16,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: "usage",
    createdBy: "fixture@example.com",
    createdAt: "2026-11-02T12:00:00Z",
    pricingSnapshot: {
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      function: "text",
      currency: "USD",
      inputCentsPerMillion: 200,
      outputCentsPerMillion: 1000,
      maxInputBytes: 65536,
      maxOutputTokens: 2048,
      source: "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
      verifiedAt: "2026-10-30",
      qualified: true,
      inputBytes: 30000,
      quoteVersion: "v1",
    },
  };
}
test("provider usage settles rounded cost and releases only the unused reservation", () => {
  const j = job(),
    usage = claudeUsage({ input_tokens: 10000, output_tokens: 1000 })!;
  assert.equal(usageCost(j, usage), 3);
  settleUsageCost(j, usage);
  assert.equal(j.actual, 3);
  assert.equal(j.reserved, 0);
  assert.equal(j.costBasis, "provider_usage");
  assert.equal(j.state, "succeeded");
});
test("unknown/cached usage retains the reservation without inventing an invoice amount", () => {
  assert.equal(claudeUsage({ input_tokens: -1, output_tokens: 10 }), undefined);
  assert.equal(
    claudeUsage({ input_tokens: "100", output_tokens: 10 }),
    undefined,
  );
  const j = job(),
    usage = claudeUsage({
      input_tokens: 1000,
      output_tokens: 100,
      cache_creation_input_tokens: 200,
    })!;
  settleUsageCost(j, usage);
  assert.equal(j.actual, undefined);
  assert.equal(j.reserved, 16);
  assert.equal(j.providerUsage?.cacheCreationTokens, 200);
});
test("usage beyond the quote is recorded honestly and blocks automatic progression until reconciliation", () => {
  const j = job();
  settleUsageCost(
    j,
    claudeUsage({ input_tokens: 200000, output_tokens: 10000 })!,
  );
  assert.equal(j.actual, 50);
  assert.equal(j.reserved, 0);
  assert.equal(j.state, "unknown");
  assert.match(j.error!, /reconcile before another paid attempt/);
});
test("a failed output contract can still have a real usage cost; its content error is preserved", () => {
  const j = job();
  j.error = "Invalid selected-piece format";
  settleUsageCost(j, claudeUsage({ input_tokens: 2000, output_tokens: 500 })!);
  assert.equal(j.actual, 1);
  assert.equal(j.error, "Invalid selected-piece format");
});
test("LOCAL MOCK ONLY: tool-free Claude adapter retains token usage without adding a search or retry", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, request) => {
    calls++;
    assert.equal(String(url), "https://api.anthropic.com/v1/messages");
    const body = JSON.parse(String(request?.body));
    assert.equal(body.tools, undefined);
    assert.equal(body.max_tokens, 2048);
    return Response.json({
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "A useful handoff explains everyday controls." },
      ],
      usage: { input_tokens: 2000, output_tokens: 500 },
    });
  };
  try {
    const connection = {
      id: "writing",
      provider: "anthropic",
      function: "text",
      model: "claude-sonnet-5-5",
      title: "Fixture",
      status: "validated",
      hasKey: true,
      updatedAt: "now",
    } as Connection;
    const output = await runProvider(job(), connection, "local-fixture-key");
    assert.equal(output.usage?.inputTokens, 2000);
    assert.equal(output.usage?.outputTokens, 500);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
