import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requestedIdeaQuantity,
  ideaJobInput,
} from "../lib/studio/idea-generation";
import {
  frozenSystem,
  quote,
  pricingSnapshotIsCurrent,
  type Rate,
} from "../lib/studio/pricing";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
test("four-idea count reaches canonical request and authoritative system contract independently of posting cadence", () => {
  const s = initialState(DEMO_ACTOR, true);
  const w = s.workflows.find(
    (w) => w.channel === "LinkedIn" && w.status === "active",
  )!;
  w.functionConnections = { ideas: "ideas-model" };
  s.connections.push({
    id: "ideas-model",
    provider: "anthropic",
    model: "test-model",
    title: "Ideas",
    function: "ideas",
    hasKey: true,
    status: "validated",
    updatedAt: new Date().toISOString(),
  });
  const input = ideaJobInput(s, DEMO_ACTOR, {
    channel: "LinkedIn",
    topic: "Four household ideas",
    audience: "Caregivers",
    quantity: 4,
    research: false,
    sourceText: "Use attached sources",
    idempotencyKey: "four",
  });
  assert.equal(requestedIdeaQuantity(input.prompt), 4);
  assert.match(JSON.parse(input.prompt).task, /exactly 4/);
  assert.match(
    frozenSystem({
      kind: "ideas",
      prompt: input.prompt,
      rulesSnapshot: "Keep factual",
      workflowSnapshot: { ...w, instructions: "Publish one post per week" },
    }),
    /exactly 4 distinct IDEA CARDS/,
  );
  const card: Rate = {
    provider: "anthropic",
    model: "test-model",
    function: "ideas",
    currency: "USD",
    inputCentsPerMillion: 100,
    outputCentsPerMillion: 500,
    maxInputBytes: 500000,
    maxOutputTokens: 2000,
    source: "https://example.com/pricing",
    verifiedAt: "2026-10-30",
    qualified: true,
  };
  const priced = quote(s, input, [card]);
  assert.equal(priced.pricingSnapshot.quoteVersion, "ideas-v2");
  assert.ok(pricingSnapshotIsCurrent(priced.pricingSnapshot, [card]));
  assert.equal(
    pricingSnapshotIsCurrent(
      { ...priced.pricingSnapshot, quoteVersion: "v1" },
      [card],
    ),
    false,
  );
  assert.equal(requestedIdeaQuantity("Legacy non-JSON request"), undefined);
  assert.equal(requestedIdeaQuantity('{"quantity":0}'), undefined);
});
