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
import { filteredState } from "../lib/studio/permissions";
import { canDispatchJob } from "../lib/studio/dispatch-permissions";
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
      autoReview: false,
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
test("human wording changes clear provider provenance, including restored drafts and imports", () => {
  let s = adopted();
  let c = s.contents[0];
  c.generatedBy = { provider: "anthropic", model: "test", jobId: "job" };
  s = applyCommand(s, DEMO_ACTOR, {
    type: "content.save", id: c.id, expectedRevision: c.revision,
    title: c.title, text: "A replacement written by a person.",
    metadata: c.metadata, media: c.media, format: c.format, account: c.account,
  }, ctx);
  c = s.contents[0];
  assert.equal(c.generatedBy, undefined);
  c.generatedBy = { provider: "anthropic", model: "test", jobId: "job" };
  s = applyCommand(s, DEMO_ACTOR, {
    type: "docs.import", contentId: c.id, expectedRevision: c.revision,
    text: "Imported wording from a document.",
  }, ctx);
  assert.equal(s.contents[0].generatedBy, undefined);
});
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

test("raw review jobs cannot manufacture authoritative reports for content not given to them", () => {
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
  s.connections.push({
    id: "review-test",
    provider: "openai",
    model: "review-model",
    function: "review",
    title: "Reviewer",
    hasKey: true,
    status: "validated",
    updatedAt: now,
    maxRequestCost: 14,
  } as never);
  s.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  )!.functionConnections = { review: "review-test" };
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "job.enqueue",
      kind: "review",
      channel: c.channel,
      contentId: c.id,
      connectionId: "review-test",
      prompt: "Review unrelated harmless content",
      estimate: 14,
      confirmed: true,
      idempotencyKey: "raw-review",
    },
    ctx,
  );
  const raw = s.jobs[0];
  assert.equal(raw.outputContract, undefined);
  settleWrittenOutput(
    s,
    raw,
    {
      completion: "complete",
      text: JSON.stringify({
        summary: "No issues found in unrelated content",
        issues: [],
      }),
    },
    now,
  );
  assert.equal(s.contents[0].agentReview, undefined);
});
test("all content charges count against the package cap, including untagged legacy jobs", () => {
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
  s.jobs.push({
    ...job(s),
    id: "legacy-charge",
    reserved: 50,
    preparationId: undefined,
  });
  assert.equal(preparationSpend(s, s.contents[0].preparationId!), 50);
  s.connections.push({
    id: "text-test",
    provider: "anthropic",
    model: "test",
    function: "text",
    title: "Text",
    hasKey: true,
    status: "validated",
    updatedAt: now,
    maxRequestCost: 14,
  } as never);
  s.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  )!.connectionId = "text-test";
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          type: "job.enqueue",
          kind: "text",
          channel: c.channel,
          contentId: c.id,
          connectionId: "text-test",
          prompt: "Another permitted request",
          estimate: 14,
          confirmed: true,
          idempotencyKey: "over-cap",
        },
        ctx,
      ),
    /total package budget/,
  );
  const other = { id: "other", email: "other@example.com" };
  s.members.push({
    ...other,
    roles: ["administrator"],
    grants: [],
    revoked: false,
  });
  assert.throws(
    () =>
      applyCommand(
        s,
        other,
        {
          type: "job.enqueue",
          kind: "text",
          channel: c.channel,
          contentId: c.id,
          connectionId: "text-test",
          prompt: "Other creator request",
          estimate: 14,
          confirmed: true,
          idempotencyKey: "other-cap",
        },
        ctx,
      ),
    /package budget authorization/,
  );
});
test("moving a draft requires destination account permission as well as source permission", () => {
  const s = adopted(),
    c = s.contents[0],
    editor = { id: "scoped", email: "scoped@example.com" };
  c.assignedTo = editor.email;
  c.account = "Allowed";
  s.members.push({
    ...editor,
    roles: ["editor"],
    revoked: false,
    grants: [
      { action: "content.edit", channel: c.channel, account: "Allowed" },
    ],
  });
  assert.throws(
    () =>
      applyCommand(
        s,
        editor,
        {
          type: "content.save",
          id: c.id,
          expectedRevision: c.revision,
          title: c.title,
          text: c.text,
          metadata: c.metadata,
          media: c.media,
          account: "Forbidden",
        },
        ctx,
      ),
    /permission/,
  );
  assert.equal(c.account, "Allowed");
});
test("editing and reverting wording never resurrects an earlier copy acceptance", () => {
  let s = adopted();
  s = applyCommand(s, DEMO_ACTOR, copyCommand(s), ctx);
  const original = s.contents[0].text;
  for (const text of ["Changed wording for this draft.", original]) {
    const c = s.contents[0];
    s = applyCommand(
      s,
      DEMO_ACTOR,
      {
        type: "content.save",
        id: c.id,
        expectedRevision: c.revision,
        title: c.title,
        text,
        metadata: c.metadata,
        media: c.media,
      },
      ctx,
    );
  }
  assert.equal(currentCopyAcceptance(s.contents[0], s), undefined);
});
test("writing result preserves existing slide layout, images, layer data and extra slides", () => {
  const s = adopted(),
    c = s.contents[0];
  c.media.slides = [
    {
      id: "keep",
      title: "Original slide",
      body: "Original body",
      x: 27,
      y: 31,
      fontSize: 42,
      color: "#123456",
      background: "#ffffff",
      image: "/api/studio/assets?id=11111111-1111-4111-8111-111111111111",
    },
    {
      id: "extra",
      title: "Keep extra",
      body: "Extra body",
      x: 9,
      y: 9,
      fontSize: 50,
      color: "#123456",
      background: "#ffffff",
    },
  ];
  const media = structuredClone(c.media),
    j = job(s);
  s.jobs.push(j);
  settleWrittenOutput(
    s,
    j,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "Complete revised text for the selected piece.",
        metadata: "",
        sources: [],
        questions: [],
        slides: [{ title: "Proposed replacement", body: "Proposed body" }],
      }),
    },
    now,
  );
  assert.equal(j.outputStatus, "applied");
  assert.deepEqual(c.media, media);
  assert.equal(j.candidate?.slides?.[0].title, "Proposed replacement");
});
test("structured missing-fact questions remain a retained candidate and never auto-apply", () => {
  const s = adopted(),
    c = s.contents[0],
    original = c.text,
    j = job(s);
  s.jobs.push(j);
  settleWrittenOutput(
    s,
    j,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "A proposed complete post needing founder confirmation.",
        metadata: "",
        sources: [],
        questions: ["Which installation is this based on?"],
      }),
    },
    now,
  );
  assert.equal(c.text, original);
  assert.equal(j.outputStatus, "ready");
  assert.match(j.error!, /unresolved factual questions/);
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        { type: "job.applyDraft", jobId: j.id, expectedRevision: c.revision },
        ctx,
      ),
    /missing facts/,
  );
});

test("preparation authorizations are visible only with access to the associated draft", () => {
  const s = adopted();
  const editor = { id: "scoped-editor", email: "editor@example.com" };
  const visible = s.contents[0];
  visible.assignedTo = editor.email;
  const hidden = structuredClone(visible);
  hidden.id = "hidden-content";
  hidden.assignedTo = "another@example.com";
  s.contents.push(hidden);
  s.members.push({ ...editor, roles: ["editor"], grants: [], revoked: false });
  s.preparations = [visible, hidden].map((c) => ({
    id: `prep-${c.id}`,
    contentId: c.id,
    channel: c.channel,
    account: c.account,
    authorizedFor: c.assignedTo,
    authorizedBy: DEMO_ACTOR.email,
    at: now,
    period: "2026-10",
    maxCents: 50,
    functions: ["text"],
    policyVersion: s.settings.reviewPolicy!.version,
  }));
  assert.deepEqual(
    filteredState(s, editor).preparations?.map((p) => p.contentId),
    [visible.id],
  );
  assert.equal(filteredState(s, DEMO_ACTOR).preparations?.length, 2);
});

test("dispatch blocks revoked read/edit or changed content scope before provider disclosure", () => {
  const s = adopted();
  const editor = { id: "dispatch-editor", email: "dispatch@example.com" };
  const c = s.contents[0];
  c.assignedTo = editor.email;
  const member = {
    ...editor,
    roles: ["editor" as const],
    revoked: false,
    grants: [
      { action: "job.create" },
      { action: "read" },
      { action: "content.edit" },
    ],
  };
  s.members.push(member);
  const j = { ...job(s), createdBy: editor.email };
  assert.equal(canDispatchJob(s, editor, j), true);
  member.grants = [{ action: "job.create" }, { action: "content.edit" }];
  assert.equal(canDispatchJob(s, editor, j), false);
  member.grants = [{ action: "job.create" }, { action: "read" }];
  assert.equal(canDispatchJob(s, editor, j), false);
  member.grants.push({ action: "content.edit" });
  c.account = "Changed account";
  assert.equal(canDispatchJob(s, editor, j), false);
  c.account = j.account!;
  c.deletedAt = now;
  assert.equal(canDispatchJob(s, editor, j), false);
});
