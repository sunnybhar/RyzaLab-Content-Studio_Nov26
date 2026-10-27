import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { quote, readRates, type Rate } from "../lib/studio/pricing";
const rate: Rate = {
  provider: "openai",
  model: "test-model",
  function: "text",
  currency: "USD",
  inputCentsPerMillion: 100,
  outputCentsPerMillion: 1000,
  maxInputBytes: 10000,
  maxOutputTokens: 6000,
  source: "https://example.com/pricing",
  verifiedAt: "2026-10-27",
  qualified: true,
};
function fixture() {
  const state = initialState(DEMO_ACTOR, true);
  state.connections.push({
    id: "c",
    title: "text",
    provider: "openai",
    model: "test-model",
    function: "text",
    hasKey: true,
    status: "validated",
    updatedAt: new Date().toISOString(),
  });
  return state;
}
test("missing qualified pricing blocks even when arbitrary connection allowance exists", () => {
  const s = fixture();
  Object.assign(s.connections[0], { maxRequestCost: 1 });
  assert.throws(
    () =>
      quote(
        s,
        {
          channel: "LinkedIn",
          kind: "text",
          connectionId: "c",
          prompt: "hello",
        },
        [],
      ),
    /No qualified/,
  );
});
test("quote reserves upper-bound output and input rather than trusting caller estimate", () => {
  const s = fixture(),
    q = quote(
      s,
      { channel: "LinkedIn", kind: "text", connectionId: "c", prompt: "hello" },
      [rate],
    );
  assert.ok(q.cost >= 6);
  Object.assign(s.connections[0], { maxRequestCost: 1 });
  assert.throws(
    () =>
      quote(
        s,
        {
          channel: "LinkedIn",
          kind: "text",
          connectionId: "c",
          prompt: "hello",
        },
        [rate],
      ),
    /exceeds/,
  );
});
test("unqualified rate cards and oversized prompts fail closed", () => {
  assert.throws(() =>
    readRates(JSON.stringify([{ ...rate, qualified: false }])),
  );
  assert.throws(
    () =>
      quote(
        fixture(),
        {
          channel: "LinkedIn",
          kind: "text",
          connectionId: "c",
          prompt: "x".repeat(11000),
        },
        [rate],
      ),
    /input limit/,
  );
});
