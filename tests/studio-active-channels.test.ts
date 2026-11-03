import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import {
  activeStudioView,
  ACTIVE_CHANNELS,
  assertActiveRequest,
} from "../lib/studio/active-channels";
import {
  ideaRequestBrief,
  ideaRequestNumber,
} from "../lib/studio/idea-request";
test("retired channels leave every channel-scoped view without deleting history or changing the billing ledger", () => {
  const s = initialState(DEMO_ACTOR, true),
    original = structuredClone(s);
  s.jobs.push({
    id: "retired-charge",
    channel: "TikTok",
    actual: 17,
    reserved: 0,
  } as any);
  const view = activeStudioView(s);
  for (const list of [
    view.workflows,
    view.contents,
    view.ideas,
    view.jobs,
    view.packages,
    view.templates,
    view.references,
  ])
    assert.ok(
      list.every(
        (item) =>
          item.channel === "Shared" ||
          (ACTIVE_CHANNELS as readonly string[]).includes(item.channel),
      ),
    );
  assert.equal(
    view.jobs.some((job) => job.id === "retired-charge"),
    false,
  );
  assert.equal(s.jobs.at(-1)!.actual, 17);
  assert.equal(s.workflows.length, original.workflows.length);
  assert.notEqual(view, s);
  assert.equal(view.version, s.version);
});
test("request metadata uses original topic and a stable durable request number, not list position", () => {
  const job = {
    id: "a32f810c-1234-4444-9999-123456789012",
    prompt: JSON.stringify({
      topic: "My original brief",
      task: "private system instructions",
      quantity: 5,
    }),
  };
  assert.equal(ideaRequestNumber(job), "IDEA-A32F810C");
  assert.equal(ideaRequestBrief(job), "My original brief");
  assert.equal(
    ideaRequestBrief({ prompt: "invalid" }),
    "Original topic not recorded",
  );
});

test("stale channel tabs cannot create fresh retired work", () => {
  const state = initialState(DEMO_ACTOR, true);
  assert.throws(
    () =>
      assertActiveRequest(state, { type: "idea.generate", channel: "Notes" }),
    /removed/,
  );
  assert.doesNotThrow(() =>
    assertActiveRequest(state, {
      type: "idea.generate",
      channel: "Newsletter",
    }),
  );
});
