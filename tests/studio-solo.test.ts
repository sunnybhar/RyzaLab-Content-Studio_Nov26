import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import {
  copyIdentity,
  currentCopyAcceptance,
  packageReadiness,
} from "../lib/studio/solo-quality";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import { preparationSpend } from "../lib/studio/preparation-budget";
import type { Job, StudioState } from "../lib/studio/types";
const now = "2026-10-29T12:00:00Z";
const ctx = { demo: true, now };
function adopted() {
  let s = initialState(DEMO_ACTOR, true);
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "policy.adoptSolo",
      packageCap: 50,
      monthlyCap: 500,
      requireIndependentReview: false,
      autoDraft: true,
      autoReview: true,
      expectedRuleVersion: s.settings.protectedVersion,
    },
    ctx,
  );
  const c = s.contents[0];
  c.text = "A useful handoff lists the household routine and who to contact.";
  c.media = structuredClone(EMPTY_MEDIA);
  c.format = "Text post";
  return s;
}
function copyCommand(s: StudioState) {
  const c = s.contents[0];
  return {
    type: "content.acceptCopy",
    contentId: c.id,
    expectedRevision: c.revision,
    expectedWorkflowId: s.workflows.find(
      (w) => w.channel === c.channel && w.status === "active",
    )!.id,
    expectedRuleVersion: s.settings.protectedVersion,
    expectedPolicyVersion: s.settings.reviewPolicy!.version,
    evidence:
      "Human checked current copy against supplied brand references; no unsupported statistics.",
  };
}
function finalCommand(s: StudioState) {
  const c = s.contents[0];
  return {
    type: "package.approve",
    contentId: c.id,
    expectedRevision: c.revision,
    expectedWorkflowId: s.workflows.find(
      (w) => w.channel === c.channel && w.status === "active",
    )!.id,
    expectedRuleVersion: s.settings.protectedVersion,
    expectedCopyAcceptanceId: currentCopyAcceptance(c, s)?.id,
    expectedPolicyVersion: s.settings.reviewPolicy!.version,
    handoff: true,
  };
}
function job(s: StudioState): Job {
  const c = s.contents[0];
  return {
    id: "draft-job",
    kind: "text",
    channel: c.channel,
    account: c.account,
    contentId: c.id,
    prompt: "Write the selected post",
    connectionId: "text",
    estimate: 14,
    reserved: 14,
    state: "succeeded",
    attempt: 1,
    idempotencyKey: "draft-key",
    createdBy: DEMO_ACTOR.email,
    createdAt: now,
    targetRevision: c.revision,
    targetIdentity: copyIdentity(c, s),
    targetAccepted: false,
    outputContract: "draft_v1",
    connectionSnapshot: {
      provider: "anthropic",
      model: "test-model",
      function: "text",
    },
  };
}
const output = {
  completion: "complete" as const,
  text: JSON.stringify({
    body: "A practical household handoff explains responsibilities and recovery steps.",
    metadata: "",
    sources: [],
    questions: [],
  }),
};
test("only founder adopts versioned two-review policy; ordinary settings cannot inject it", () => {
  const s = initialState(DEMO_ACTOR, true);
  const admin = { id: "admin", email: "admin@example.com" };
  s.members.push({
    ...admin,
    roles: ["administrator"],
    grants: [],
    revoked: false,
  });
  assert.throws(
    () =>
      applyCommand(
        s,
        admin,
        {
          type: "policy.adoptSolo",
          packageCap: 50,
          monthlyCap: 500,
          requireIndependentReview: false,
          autoDraft: true,
          autoReview: true,
          expectedRuleVersion: s.settings.protectedVersion,
        },
        ctx,
      ),
    /permission/,
  );
  const a = adopted();
  assert.equal(a.settings.reviewPolicy?.adoptedBy, DEMO_ACTOR.email);
  assert.notEqual(a.settings.reviewPolicy?.version, undefined);
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { type: "settings.save", reviewPolicy: a.settings.reviewPolicy },
        ctx,
      ),
    /Invalid command/,
  );
});
test("two human decisions approve exact copy/package and explicit handoff without forging six stage passes", () => {
  let s = adopted();
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, finalCommand(s), ctx),
    /Copy acceptance|approve the current copy/i,
  );
  s = applyCommand(s, DEMO_ACTOR, copyCommand(s), ctx);
  assert.ok(currentCopyAcceptance(s.contents[0], s));
  assert.equal(packageReadiness(s.contents[0], s).ready, true);
  s = applyCommand(s, DEMO_ACTOR, finalCommand(s), ctx);
  assert.equal(s.packages.length, 1);
  assert.equal(
    (s.packages[0] as unknown as { copyAcceptanceSnapshot: { actor: string } })
      .copyAcceptanceSnapshot.actor,
    DEMO_ACTOR.email,
  );
  assert.deepEqual(
    s.contents[0].stages?.map((r) => r.key),
    ["handoff"],
  );
  assert.equal(s.contents[0].stages?.[0].actor, DEMO_ACTOR.email);
});
test("copy acceptance invalidates on text/source/destination changes but not asset-only edits", () => {
  let s = adopted();
  s = applyCommand(s, DEMO_ACTOR, copyCommand(s), ctx);
  const c = s.contents[0];
  const changed = structuredClone(s);
  changed.contents[0].text += " Changed.";
  assert.equal(currentCopyAcceptance(changed.contents[0], changed), undefined);
  const destination = structuredClone(s);
  destination.contents[0].account = "Another account";
  assert.equal(
    currentCopyAcceptance(destination.contents[0], destination),
    undefined,
  );
  const image = structuredClone(s);
  image.contents[0].media.imageUrl =
    "/api/studio/assets?id=11111111-1111-4111-8111-111111111111";
  assert.ok(currentCopyAcceptance(image.contents[0], image));
  const sources = structuredClone(s);
  const w = sources.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  )!;
  w.references.push("new-ref");
  sources.references.push({
    id: "new-ref",
    title: "New",
    content: "Changed source material",
    channel: c.channel,
    kind: "source",
    createdAt: now,
  });
  assert.equal(currentCopyAcceptance(sources.contents[0], sources), undefined);
});
test("a Creator cannot turn edit authority into copy approval", () => {
  const s = adopted(),
    creator = { id: "creator", email: "creator@example.com" };
  s.members.push({
    ...creator,
    roles: ["creator"],
    grants: [],
    revoked: false,
  });
  s.contents[0].assignedTo = creator.email;
  assert.throws(
    () => applyCommand(s, creator, copyCommand(s), ctx),
    /package.approve/,
  );
});
test("draft candidate attaches once only to enqueue-pinned unchanged copy", () => {
  const s = adopted(),
    j = job(s);
  s.jobs.push(j);
  const before = s.contents[0].text;
  settleWrittenOutput(s, j, output, now);
  assert.equal(j.outputStatus, "applied");
  assert.equal(s.contents[0].revision, 2);
  assert.equal(s.contents[0].history.at(-1)?.text, before);
  const history = s.contents[0].history.length;
  settleWrittenOutput(s, j, output, now);
  assert.equal(s.contents[0].history.length, history);
  assert.equal(s.contents[0].generatedBy?.provider, "anthropic");
});
test("queued edits, accepted copy, revoked owner and incomplete output never get overwritten", () => {
  for (const mode of ["edit", "accept", "revoked", "incomplete", "trash"]) {
    let s = adopted();
    const j = job(s);
    s.jobs.push(j);
    if (mode === "edit") {
      s.contents[0].text = "Manual replacement";
      s.contents[0].revision++;
    }
    if (mode === "accept") s = applyCommand(s, DEMO_ACTOR, copyCommand(s), ctx);
    if (mode === "revoked") s.members[0].revoked = true;
    if (mode === "trash") s.contents[0].deletedAt = now;
    const c = structuredClone(s.contents[0]);
    const actual = s.jobs.find((x) => x.id === j.id)!;
    settleWrittenOutput(
      s,
      actual,
      mode === "incomplete" ? { ...output, completion: "incomplete" } : output,
      now,
    );
    assert.deepEqual(s.contents[0], c, mode);
    assert.notEqual(actual.outputStatus, "applied");
    assert.equal(actual.reserved, 14);
  }
});
test("Notes need independent report and founder release authority, beyond ordinary admin rights", () => {
  let s = adopted();
  const c = s.contents[0];
  c.channel = "Notes";
  s = applyCommand(s, DEMO_ACTOR, copyCommand(s), ctx);
  assert.match(
    packageReadiness(s.contents[0], s).blockers.join(" "),
    /independent/,
  );
  s.contents[0].agentReview = {
    jobId: "independent",
    identity: copyIdentity(s.contents[0], s),
    provider: "openai",
    model: "test-review",
    independent: true,
    at: now,
    summary: "Separate qualified provider reviewed supplied text",
    issues: [],
    context: "provided_references",
  };
  const admin = { id: "admin", email: "admin@example.com" };
  s.members.push({
    ...admin,
    roles: ["administrator"],
    grants: [],
    revoked: false,
  });
  assert.throws(
    () =>
      applyCommand(s, admin, { ...finalCommand(s), authorizeNote: true }, ctx),
    /policy.manage/,
  );
  assert.throws(
    () => applyCommand(s, DEMO_ACTOR, finalCommand(s), ctx),
    /Founder release authorization/,
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { ...finalCommand(s), authorizeNote: true },
    ctx,
  );
  assert.ok(s.audit.some((a) => a.action === "note.release_authorized"));
});
test("preparation spending survives revision/policy authorization changes and never resets existing consumption", () => {
  let s = adopted();
  const c = s.contents[0];
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      maxCents: 50,
      expectedRevision: c.revision,
    },
    ctx,
  );
  const first = s.contents[0].preparationId!;
  s.jobs.push({ ...job(s), preparationId: first });
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "policy.adoptSolo",
      packageCap: 50,
      monthlyCap: 500,
      requireIndependentReview: false,
      autoDraft: true,
      autoReview: true,
      expectedRuleVersion: s.settings.protectedVersion,
    },
    ctx,
  );
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "preparation.authorize",
      contentId: c.id,
      maxCents: 50,
      expectedRevision: c.revision,
    },
    ctx,
  );
  assert.notEqual(s.contents[0].preparationId, first);
  assert.equal(preparationSpend(s, s.contents[0].preparationId!), 14);
});
test("selecting an idea opens one linked draft without duplicate content", () => {
  let s = adopted();
  const idea = s.ideas[0];
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "idea.use", id: idea.id, format: "Text post", account: "RyzaLab" },
    ctx,
  );
  const first = s.contents.find((c) => c.ideaId === idea.id)!;
  const count = s.contents.length;
  s = applyCommand(
    s,
    DEMO_ACTOR,
    { type: "idea.use", id: idea.id, format: "Text post", account: "RyzaLab" },
    ctx,
  );
  assert.equal(s.contents.length, count);
  assert.equal(s.contents.find((c) => c.ideaId === idea.id)?.id, first.id);
});
