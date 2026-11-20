import { completeChecks } from "./stage-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { packageReadiness } from "../lib/studio/solo-quality";
import { applyCommand } from "../lib/studio/engine";
function fixture() {
  const state = initialState(DEMO_ACTOR, true);
  state.contents[0].text =
    "A useful handoff explains account access and recovery.";
  return state;
}
function approve(s: ReturnType<typeof fixture>, extra = {}) {
  s = completeChecks(s, DEMO_ACTOR, s.contents[0].id, { demo: true });
  return applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "package.approve",
      contentId: s.contents[0].id,
      expectedRevision: s.contents[0].revision,
      expectedWorkflowId: "seed-linkedin",
      expectedRuleVersion: s.settings.protectedVersion,
      ...extra,
    },
    { demo: true },
  );
}
test("approval rejects unseen workflow and protected policy versions", () => {
  const state = fixture();
  assert.throws(
    () => approve(state, { expectedWorkflowId: "old-workflow" }),
    /changed/,
  );
  assert.throws(
    () => approve(state, { expectedRuleVersion: "old-rules" }),
    /changed/,
  );
  const next = approve(state);
  assert.equal(
    (next.packages[0] as unknown as { rulesSnapshot: string }).rulesSnapshot,
    state.settings.protectedRules,
  );
});
test("arbitrary URLs cannot masquerade as retained approved video or image assets", () => {
  const state = fixture();
  state.contents[0].media.scenes = [
    {
      id: "scene",
      title: "test",
      script: "A real scene.",
      duration: 2,
      sourceUrl: "x",
      preserveAudio: true,
    },
  ];
  assert.throws(() => approve(state), /immutable/);
  state.contents[0].media.scenes = [];
  state.contents[0].media.imageUrl = "https://example.com/mutable.png";
  assert.throws(() => approve(state), /immutable/);
});
test("human confirmation rejects a package changed after the person published", () => {
  let state = approve(fixture());
  state = applyCommand(state, DEMO_ACTOR, {
    type: "schedule.create",
    contentId: state.contents[0].id,
    packageId: state.packages[0].id,
    at: "2026-11-01T00:00:00Z",
  });
  assert.throws(
    () =>
      applyCommand(state, DEMO_ACTOR, {
        type: "schedule.confirm",
        id: state.schedules[0].id,
        url: "https://linkedin.com/posts/example",
        expectedPackageId: "the-package-I-published",
      }),
    /package changed/,
  );
});

test("founder price exception is exact-revision scoped and cannot waive misinformation checks", () => {
  let state = fixture();
  state.contents[0].text = "Book a free intro call.";
  assert.deepEqual(packageReadiness(state.contents[0], state, true).priceLines, ["Book a free intro call."]);
  assert.throws(() => approve(state), /founder exception.*Book a free intro call/);
  state = applyCommand(state, DEMO_ACTOR, {
    type: "exception.record",
    contentId: state.contents[0].id,
    expectedRevision: 1,
    wording: "Book a free intro call.",
    reason: "Founder confirms the offer and authorizes this exact CTA.",
  });
  assert.deepEqual(packageReadiness(state.contents[0], state, true).priceLines, []);
  assert.equal(approve(state).packages.length, 1);
  state.contents[0].text =
    "Nothing ever leaves your home.\nBook a free intro call.";
  assert.throws(() => approve(state), /blocking/);
});

test("repeated calendar submits reuse the exact package and instant while calendar authority stays separate", () => {
  let state = approve(fixture());
  const original = state.packages[0];
  const command = {
    type: "schedule.create",
    contentId: original.contentId,
    packageId: original.id,
    at: "2026-11-05T14:30:00Z",
  };
  state = applyCommand(state, DEMO_ACTOR, command);
  state = applyCommand(state, DEMO_ACTOR, {
    ...command,
    at: "2026-11-05T09:30:00-05:00",
  });
  assert.equal(state.schedules.length, 1);
  assert.equal(state.schedules[0].packageId, original.id);
  assert.equal(state.schedules[0].state, "planned");
  assert.equal(state.schedules[0].publicationUrl, undefined);
  const reviewer = { id: "reviewer-only", email: "reviewer-only@example.com" };
  state.members.push({
    ...reviewer,
    roles: ["viewer"],
    grants: [{ action: "package.approve", contentId: original.contentId }],
    revoked: false,
  });
  assert.throws(
    () =>
      applyCommand(state, reviewer, { ...command, at: "2026-11-06T14:30:00Z" }),
    /permission/,
  );
  assert.deepEqual(state.packages[0], original);
});

test("non-commercial uses of free do not block approval", () => {
  const state = fixture();
  state.contents[0].text = "Feel free to inspect hands-free controls. The dashboard is free of clutter. See https://example.com/free.";
  assert.deepEqual(packageReadiness(state.contents[0], state, true).priceLines, []);
  assert.equal(approve(state).packages.length, 1);
});

test("returning a newsletter to draft preserves the saved material and invalidates the review revision", () => {
  const state = fixture();
  const draft = state.contents[0];
  draft.channel = "Newsletter";
  draft.state = "review";
  draft.reviewSubmission = { id: "submission", identity: "reviewed", actor: DEMO_ACTOR.email, at: draft.updatedAt };
  const command = { type: "content.returnToDraft", id: draft.id, expectedRevision: draft.revision };
  assert.throws(() => applyCommand(state, DEMO_ACTOR, { ...command, expectedRevision: draft.revision + 1 }), /changed/);

  const next = applyCommand(state, DEMO_ACTOR, command).contents[0];
  assert.equal(next.state, "draft");
  assert.equal(next.revision, draft.revision + 1);
  assert.equal(next.reviewSubmission, undefined);
  assert.equal(next.text, draft.text);
  assert.deepEqual(next.media, draft.media);
});
