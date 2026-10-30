import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { parseGeneratedIdeas } from "../lib/studio/idea-generation";
import type { Job } from "../lib/studio/types";
const format =
  "LinkedIn text post, 120 to 250 words, 2 hook options, optional photo of a handwritten note with no personal details. Include a short supporting checklist for review.";
const card = {
  title: "A documented routine and a clear handoff",
  brief:
    "An educational angle that needs factual and human review before becoming a post.",
  audience: "Family caregivers",
  format,
  sources: [
    "ryzalab-brand-brain.md (Proof library R-01, R-04; Guardrails 2, 7, 10)",
    "playbook-linkedin.md (From the inside post type)",
    "https://example.com/reference",
  ],
};
function fixture() {
  const state = initialState(DEMO_ACTOR, true);
  const job: Job = {
    id: "saved-ideas-result",
    kind: "ideas",
    channel: "LinkedIn",
    prompt: "Original already-completed request",
    connectionId: "retained-connection",
    estimate: 14,
    reserved: 14,
    actual: undefined,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: "completed-once",
    createdBy: DEMO_ACTOR.email,
    createdAt: "2026-10-28T10:00:00Z",
    result: JSON.stringify({
      ideas: [
        card,
        { ...card, title: "Document the routine before automating it" },
        { ...card, title: "A clear recovery checklist" },
      ],
    }),
    error: "Old import schema rejected source references",
  };
  state.jobs.push(job);
  return state;
}
const command = { type: "idea.importSavedResult", jobId: "saved-ideas-result" };
test("internal file citations and descriptive format fields import intact", () => {
  assert.ok(format.length > 150);
  const items = parseGeneratedIdeas(JSON.stringify({ ideas: [card] }));
  assert.deepEqual(items, [card]);
});
test("saved-response recovery imports pending cards once without changing job dispatch, costs or raw response", () => {
  const state = fixture(),
    job = structuredClone(state.jobs[0]);
  const next = applyCommand(state, DEMO_ACTOR, command, { demo: true });
  const imported = next.ideas.filter((i) => i.generationRunId === job.id);
  assert.equal(imported.length, 3);
  assert.ok(
    imported.every((i) => i.state === "pending" && i.origin === "agent"),
  );
  assert.deepEqual(imported[2].sources, card.sources);
  assert.equal(imported[2].format, format);
  for (const key of [
    "state",
    "result",
    "estimate",
    "reserved",
    "actual",
    "attempt",
    "idempotencyKey",
    "connectionId",
  ] as const)
    assert.deepEqual(next.jobs[0][key], job[key]);
  assert.equal(next.jobs.length, state.jobs.length);
  const twice = applyCommand(next, DEMO_ACTOR, command, { demo: true });
  assert.deepEqual(twice, next);
  assert.equal(
    state.ideas.filter((i) => i.generationRunId === job.id).length,
    0,
  );
});
test("malformed or partial sets do not import partial cards or spend again", () => {
  const state = fixture();
  state.jobs[0].result = JSON.stringify({
    ideas: [card, { ...card, title: "bad", sources: [123] }],
  });
  assert.throws(
    () => applyCommand(state, DEMO_ACTOR, command, { demo: true }),
    /No partial cards/,
  );
  assert.equal(state.jobs[0].reserved, 14);
  assert.equal(
    state.ideas.filter((i) => i.generationRunId === "saved-ideas-result")
      .length,
    0,
  );
});
test("recovery requires completed Ideas results and the requesting member permissions", () => {
  const state = fixture();
  const other = { id: "other", email: "other@example.com" };
  state.members.push({
    ...other,
    roles: ["creator"],
    grants: [],
    revoked: false,
  });
  assert.throws(
    () => applyCommand(state, other, command, { demo: true }),
    /another member/,
  );
  state.jobs[0].state = "running";
  assert.throws(
    () => applyCommand(state, DEMO_ACTOR, command, { demo: true }),
    /completed Ideas/,
  );
  state.jobs[0].state = "succeeded";
  state.jobs[0].kind = "text";
  assert.throws(
    () => applyCommand(state, DEMO_ACTOR, command, { demo: true }),
    /completed Ideas/,
  );
});
test("source/format limits still reject oversized data and unknown card fields", () => {
  for (const patch of [
    { format: "a".repeat(1001) },
    { sources: ["a".repeat(2001)] },
    { unexpected: "untrusted" },
  ])
    assert.throws(
      () =>
        parseGeneratedIdeas(JSON.stringify({ ideas: [{ ...card, ...patch }] })),
      /no partial/,
    );
});

test("a request for four requires all four complete cards, not one combined card", () => {
  assert.throws(
    () => parseGeneratedIdeas(JSON.stringify({ ideas: [card] }), 4),
    /Requested 4 ideas, but the provider returned 1/,
  );
  const four = Array.from({ length: 4 }, (_, i) => ({
    ...card,
    title: `Idea ${i + 1}: distinct handoff angle`,
  }));
  assert.equal(
    parseGeneratedIdeas(JSON.stringify({ ideas: four }), 4).length,
    4,
  );
  const s = fixture();
  s.jobs[0].prompt = JSON.stringify({ quantity: 4 });
  s.jobs[0].result = JSON.stringify({ ideas: [card] });
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, command, { demo: true }),
    /Requested 4 ideas/,
  );
  assert.equal(s.jobs.length, 1);
  assert.equal(
    s.ideas.filter((i) => i.generationRunId === s.jobs[0].id).length,
    0,
  );
});
