import { completeChecks } from "./stage-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCommand, type ExecutionContext } from "../lib/studio/engine";
import { can, filteredState, StudioError } from "../lib/studio/permissions";
import { initialState } from "../lib/studio/seed";
import type {
  Actor,
  Content,
  Grant,
  Job,
  Member,
  StudioState,
} from "../lib/studio/types";

const founder: Actor = { id: "founder", email: "founder@example.com" };
const editor: Actor = { id: "editor", email: "editor@example.com" };
const viewer: Actor = { id: "viewer", email: "viewer@example.com" };
const admin: Actor = { id: "administrator", email: "admin@example.com" };
const NOW = "2026-10-27T12:00:00.000Z";
let nextId = 0;
const context: ExecutionContext = {
  now: NOW,
  quotedCost: 100,
  id: () => `test-generated-${++nextId}`,
};
const run = (
  state: StudioState,
  command: unknown,
  actor = founder,
  ctx: ExecutionContext = context,
) => {
  const c = command as Record<string, unknown>;
  const d = state.contents.find((x) => x.id === c.contentId);
  return applyCommand(
    state,
    actor,
    c.type === "package.approve"
      ? {
          expectedWorkflowId: state.workflows.find(
            (w) => w.channel === d?.channel && w.status === "active",
          )?.id,
          expectedRuleVersion: state.settings.protectedVersion,
          ...c,
        }
      : c.type === "schedule.confirm"
        ? {
            expectedPackageId:
              state.schedules.find((s) => s.id === c.id)?.packageId ||
              "missing",
            ...c,
          }
        : c,
    ctx,
  );
};
function member(
  actor: Actor,
  roles: Member["roles"],
  grants: Grant[] = [],
): Member {
  return { ...actor, roles, grants, revoked: false };
}
function fixture(): StudioState {
  const state = initialState(founder, true);
  state.members[0].roles = ["founder"];
  state.members.push(
    member(editor, ["creator"]),
    member(viewer, ["viewer"]),
    member(admin, ["administrator"]),
  );
  state.contents[0].text =
    "A useful handoff explains account access, documentation, and recovery steps.";
  state.contents[0].metadata =
    "Alt text: A checklist for a documented handoff.";
  state.settings.monthlyCap = 10000;
  state.settings.requestCap = 1000;
  state.settings.confirmationThreshold = 1000;
  state.connections.push({
    id: "text-connection",
    title: "Configured text model",
    provider: "openai",
    function: "text",
    model: "configured-model",
    hasKey: true,
    status: "validated",
    updatedAt: NOW,
    maxRequestCost: 100,
  } as StudioState["connections"][number]);
  state.workflows.find(
    (w) => w.channel === "LinkedIn" && w.status === "active",
  )!.functionConnections = { text: "text-connection" };
  return state;
}
function saveCommand(content: Content, changes: Partial<Content> = {}) {
  return {
    type: "content.save",
    id: content.id,
    expectedRevision: content.revision,
    title: changes.title ?? content.title,
    text: changes.text ?? content.text,
    metadata: changes.metadata ?? content.metadata,
    media: changes.media ?? content.media,
  };
}
function jobCommand(
  state: StudioState,
  key = "request-1",
  changes: Record<string, unknown> = {},
) {
  return {
    type: "job.enqueue",
    kind: "text",
    channel: "LinkedIn",
    contentId: state.contents[0].id,
    prompt: "Draft a factual handoff checklist.",
    connectionId: "text-connection",
    estimate: 1,
    idempotencyKey: key,
    ...changes,
  };
}
function approved(state = fixture()): StudioState {
  state = completeChecks(state, founder, state.contents[0].id, context);
  return run(state, {
    type: "package.approve",
    contentId: state.contents[0].id,
    expectedRevision: state.contents[0].revision,
  });
}
function scheduled(state = approved()): StudioState {
  state = run(state, {
    type: "stage.decide",
    contentId: state.contents[0].id,
    stage: "handoff",
    status: "pass",
    reason: "Human prepared the approved package.",
    evidence: "Exact package exported and inspected.",
    expectedRevision: state.contents[0].revision,
    expectedWorkflowId: state.workflows.find(
      (w) => w.channel === state.contents[0].channel && w.status === "active",
    )?.id,
    expectedRuleVersion: state.settings.protectedVersion,
    packageId: state.packages[0].id,
  });
  return run(state, {
    type: "schedule.create",
    contentId: state.contents[0].id,
    packageId: state.packages[0].id,
    at: "2026-10-30T12:00:00.000Z",
  });
}
function rejects(
  state: StudioState,
  command: unknown,
  code: number,
  pattern: RegExp,
  actor = founder,
) {
  const before = structuredClone(state);
  assert.throws(
    () => run(state, command, actor),
    (error) =>
      error instanceof StudioError &&
      error.code === code &&
      pattern.test(error.message),
  );
  assert.deepEqual(
    state,
    before,
    "A rejected command must not mutate its input state.",
  );
}

test("viewer cannot create, edit, approve, change roles, or change protected rules", () => {
  const state = fixture();
  state.contents[0].assignedTo = viewer.email;
  rejects(
    state,
    {
      type: "content.create",
      channel: "LinkedIn",
      title: "Unauthorized",
      format: "Post",
    },
    403,
    /permission/,
    viewer,
  );
  rejects(
    state,
    saveCommand(state.contents[0], { text: "Unauthorized edit" }),
    403,
    /permission/,
    viewer,
  );
  rejects(
    state,
    {
      type: "package.approve",
      contentId: state.contents[0].id,
      expectedRevision: 1,
    },
    403,
    /permission/,
    viewer,
  );
  rejects(
    state,
    {
      type: "member.save",
      email: viewer.email,
      roles: ["founder"],
      grants: [],
    },
    403,
    /permission/,
    viewer,
  );
  rejects(
    state,
    { type: "policy.save", rules: "Remove all protections." },
    403,
    /permission/,
    viewer,
  );
});

test("every grant dimension must match within one grant; dimensions cannot be assembled from different grants", () => {
  const state = fixture();
  const user = state.members.find((value) => value.email === editor.email)!;
  user.grants = [
    {
      action: "job.create",
      channel: "LinkedIn",
      contentId: "content-a",
      account: "Account A",
      function: "text",
    },
    {
      action: "job.create",
      channel: "Instagram",
      contentId: "content-b",
      account: "Account B",
      function: "image",
    },
  ];
  const allowed = {
    channel: "LinkedIn" as const,
    contentId: "content-a",
    account: "Account A",
    function: "text" as const,
  };
  assert.equal(can(state, editor, "job.create", allowed), true);
  for (const changed of [
    { channel: "Instagram" as const },
    { contentId: "content-b" },
    { account: "Account B" },
    { function: "image" as const },
  ])
    assert.equal(
      can(state, editor, "job.create", { ...allowed, ...changed }),
      false,
    );
  assert.equal(
    can(state, editor, "content.edit", allowed),
    false,
    "Action must also match.",
  );
  assert.equal(
    can(state, editor, "job.create", { channel: "LinkedIn" }),
    false,
    "A missing scope dimension cannot satisfy a restricted grant.",
  );
  assert.equal(
    can(state, editor, "workflow.edit", { channel: "LinkedIn" }),
    false,
    "Scoped grants replace broad profile defaults.",
  );
});

test("read filtering excludes inaccessible packages, schedules, jobs, notices, and membership details", () => {
  const state = scheduled();
  state.contents.push({
    ...structuredClone(state.contents[0]),
    id: "private-content",
    assignedTo: admin.email,
  });
  state.packages.push({
    ...structuredClone(state.packages[0]),
    id: "private-package",
    contentId: "private-content",
  });
  state.schedules.push({
    ...structuredClone(state.schedules[0]),
    id: "private-schedule",
    contentId: "private-content",
  });
  state.members.find((item) => item.email === viewer.email)!.grants = [
    {
      action: "read",
      contentId: state.contents[0].id,
      channel: "LinkedIn",
      account: state.contents[0].account,
    },
  ];
  const result = filteredState(state, viewer);
  assert.deepEqual(
    result.contents.map((item) => item.id),
    [state.contents[0].id],
  );
  assert.deepEqual(
    result.packages.map((item) => item.id),
    [state.packages[0].id],
  );
  assert.deepEqual(
    result.schedules.map((item) => item.id),
    [state.schedules[0].id],
  );
  assert.ok(result.members.every((item) => item.email === viewer.email));
  assert.ok(result.notices.every((item) => item.user === viewer.email));
  assert.equal(state.contents.length, 2);
});

test("founder can approve alone and later text edits retain the exact approved package and media revision", () => {
  let state = fixture();
  const original = structuredClone(state);
  state = approved(state);
  assert.equal(state.packages.length, 1);
  assert.equal(state.packages[0].approvedBy, founder.email);
  assert.equal(state.packages[0].approvedAt, NOW);
  const snapshot = structuredClone(state.packages[0]);
  assert.deepEqual(original.packages, []);
  assert.notStrictEqual(state.packages[0].media, state.contents[0].media);
  state = run(
    state,
    saveCommand(state.contents[0], {
      text: "An updated written handoff includes a documented recovery plan.",
    }),
  );
  assert.deepEqual(state.packages[0], snapshot);
  assert.equal(state.contents[0].revision, 2);
  assert.equal(state.contents[0].textRevision, 2);
  assert.equal(state.contents[0].mediaRevision, 1);
  state = completeChecks(state, founder, state.contents[0].id, context);
  state = run(state, {
    type: "package.approve",
    contentId: state.contents[0].id,
    expectedRevision: 2,
  });
  assert.equal(state.packages[0].mediaId, snapshot.mediaId);
  assert.notEqual(state.packages[0].textId, snapshot.textId);
  assert.deepEqual(state.packages[1], snapshot);
});

test("approval blocks unresolved factual wording, placeholders, prohibited claims, pricing, and unfinished video scenes", () => {
  for (const text of [
    "[Ryan to confirm: specific example.]",
    "Claim status: NEEDS_SOURCE.",
    "Nothing ever leaves your home.",
    "Get a free consultation.",
    "The offer is $395.",
  ]) {
    const state = fixture();
    state.contents[0].text = text;
    rejects(
      state,
      {
        type: "package.approve",
        contentId: state.contents[0].id,
        expectedRevision: 1,
      },
      400,
      /Resolve|wording/,
    );
  }
  const state = fixture();
  state.contents[0].media.scenes = [
    {
      id: "unfinished-scene",
      title: "Opening",
      script: "A documented handoff.",
      duration: 5,
      preserveAudio: false,
    },
  ];
  rejects(
    state,
    {
      type: "package.approve",
      contentId: state.contents[0].id,
      expectedRevision: 1,
    },
    400,
    /completed scene media/,
  );
});

test("stale save and approval revisions reject rather than overwrite another editor", () => {
  const state = run(
    fixture(),
    saveCommand(fixture().contents[0], { text: "A more recent Studio edit." }),
  );
  rejects(
    state,
    {
      ...saveCommand(state.contents[0], { text: "A stale edit." }),
      expectedRevision: 1,
    },
    409,
    /changed/,
  );
  rejects(
    state,
    {
      type: "package.approve",
      contentId: state.contents[0].id,
      expectedRevision: 1,
    },
    409,
    /changed/,
  );
});

test("Docs imports preserve displaced Studio content and approved packages; stale fetched imports reject", () => {
  let state = approved();
  const pkg = structuredClone(state.packages[0]);
  const id = state.contents[0].id;
  state = run(state, {
    type: "docs.link",
    contentId: id,
    docId: "document_reference_123",
  });
  const fetchedRevision = state.contents[0].revision;
  state = run(
    state,
    saveCommand(state.contents[0], {
      text: "Studio changes made after Docs fetch started.",
    }),
  );
  const studioText = state.contents[0].text;
  rejects(
    state,
    {
      type: "docs.import",
      contentId: id,
      expectedRevision: fetchedRevision,
      text: "Fetched Google Docs text.",
    },
    409,
    /changed/,
  );
  assert.equal(state.contents[0].text, studioText);
  assert.deepEqual(state.packages[0], pkg);
  const mediaRevision = state.contents[0].mediaRevision;
  state = run(state, {
    type: "docs.import",
    contentId: id,
    expectedRevision: state.contents[0].revision,
    text: "Reviewed Google Docs text.",
  });
  assert.equal(state.contents[0].text, "Reviewed Google Docs text.");
  assert.equal(state.contents[0].history.at(-1)?.text, studioText);
  assert.match(
    state.contents[0].history.at(-1)?.reason || "",
    /displaced Studio version retained/,
  );
  assert.equal(state.contents[0].mediaRevision, mediaRevision);
  assert.deepEqual(state.packages[0], pkg);
});

const workflowCommand = {
  type: "workflow.save",
  channel: "LinkedIn",
  title: "A revised workflow",
  audience: "Homeowners",
  instructions: "Use supported facts.",
  guardrails: "Human approval required.",
  references: ["brand-core"],
  examples: "A sourced example.",
  outputFormat: "Hook, body, metadata.",
  checks: "Evidence and disclosures.",
  connectionId: "text-connection",
};
test("workflow saves create drafts, submission precedes activation, and only an eligible actor can activate", () => {
  let state = fixture();
  const previous = structuredClone(
    state.workflows.find(
      (item) => item.channel === "LinkedIn" && item.status === "active",
    ),
  );
  state = run(state, workflowCommand, editor);
  const workflow = state.workflows[0];
  assert.equal(workflow.status, "draft");
  assert.equal(workflow.version, 2);
  assert.deepEqual(
    state.workflows.find((item) => item.id === previous!.id),
    previous,
  );
  rejects(state, { type: "workflow.activate", id: workflow.id }, 400, /Submit/);
  state = run(state, { type: "workflow.submit", id: workflow.id }, editor);
  assert.equal(state.workflows[0].status, "review");
  rejects(
    state,
    { type: "workflow.activate", id: workflow.id },
    403,
    /permission/,
    editor,
  );
  state = run(state, { type: "workflow.activate", id: workflow.id });
  assert.equal(state.workflows[0].status, "active");
  assert.equal(
    state.workflows.find((item) => item.id === previous!.id)?.status,
    "review",
  );
  assert.equal(
    state.workflows.filter(
      (item) => item.channel === "LinkedIn" && item.status === "active",
    ).length,
    1,
  );
  rejects(state, workflowCommand, 403, /permission/, viewer);
});

test("administrators can assign founder access through an audited People change", () => {
  let state = fixture();
  assert.equal(can(state, admin, "policy.manage"), false);
  rejects(
    state,
    { type: "policy.save", rules: "An unauthorized policy rewrite." },
    403,
    /permission/,
    admin,
  );
  state = run(
    state,
    {
      type: "member.save",
      email: admin.email,
      roles: ["administrator", "founder"],
      grants: [],
    },
    admin,
  );
  assert.equal(state.audit.at(-1)?.action, "member.save");
  assert.equal(state.audit.at(-1)?.actor, admin.email);
  state = run(
    state,
    { type: "policy.save", rules: "A founder-approved policy revision." },
    admin,
  );
  assert.equal(
    state.settings.protectedRules,
    "A founder-approved policy revision.",
  );
});

for (const gate of [
  "monthly studio",
  "per-request",
  "function",
  "user",
  "channel",
  "account",
] as const) {
  test(`${gate} budget blocks a reservation without creating a job or consuming allowance`, () => {
    const state = fixture();
    const content = state.contents[0];
    if (gate === "monthly studio") state.settings.monthlyCap = 99;
    if (gate === "per-request") state.settings.requestCap = 99;
    if (gate === "function") state.settings.functionCaps.text = 99;
    if (gate === "user") state.settings.userCaps[founder.email] = 99;
    if (gate === "channel") state.settings.channelCaps = { LinkedIn: 99 };
    if (gate === "account")
      state.settings.accountCaps = { [content.account]: 99 };
    rejects(state, jobCommand(state), 409, new RegExp(gate));
    assert.equal(state.jobs.length, 0);
  });
}

test("scope budgets accumulate reservations within their exact monthly dimensions", () => {
  let state = fixture();
  state.settings.functionCaps.text = 150;
  state.settings.channelCaps = { LinkedIn: 150 };
  state.settings.accountCaps = { [state.contents[0].account]: 150 };
  state.settings.userCaps[founder.email] = 150;
  state = run(state, jobCommand(state));
  assert.equal(state.jobs[0].reserved, 100);
  assert.equal(
    state.jobs[0].estimate,
    100,
    "Client estimate cannot override validated connection allowance.",
  );
  rejects(state, jobCommand(state, "request-2"), 409, /function/);
  const prior: Job = {
    ...structuredClone(state.jobs[0]),
    id: "prior-month",
    period: "2026-09",
    idempotencyKey: "prior-month-request",
  };
  state = fixture();
  state.settings.monthlyCap = 150;
  state.jobs = [prior];
  state = run(state, jobCommand(state));
  assert.equal(
    state.jobs.length,
    2,
    "Previous-month spending does not consume the current allowance.",
  );
});

test("zero caps, missing conservative provider allowance, and unpriced requests fail closed", () => {
  for (const gate of [
    "monthly",
    "request",
    "function",
    "user",
    "channel",
    "account",
  ]) {
    const state = fixture();
    if (gate === "monthly") state.settings.monthlyCap = 0;
    if (gate === "request") state.settings.requestCap = 0;
    if (gate === "function") state.settings.functionCaps.text = 0;
    if (gate === "user") state.settings.userCaps[founder.email] = 0;
    if (gate === "channel") state.settings.channelCaps = { LinkedIn: 0 };
    if (gate === "account")
      state.settings.accountCaps = { [state.contents[0].account]: 0 };
    rejects(state, jobCommand(state), 409, /limit/);
  }
  const state = fixture();
  delete (
    state.connections[0] as StudioState["connections"][number] & {
      maxRequestCost?: number;
    }
  ).maxRequestCost;
  rejects(state, jobCommand(state), 400, /conservative request allowance/);
});

test("confirmation reserves only after explicit confirmation and rechecks current caps", () => {
  let state = fixture();
  state.settings.confirmationThreshold = 50;
  state = run(state, jobCommand(state));
  assert.equal(state.jobs[0].state, "awaiting_confirmation");
  assert.equal(state.jobs[0].reserved, 0);
  assert.equal(state.jobs[0].attempt, 0);
  const waiting = structuredClone(state);
  waiting.settings.monthlyCap = 99;
  rejects(
    waiting,
    { type: "job.confirm", id: waiting.jobs[0].id },
    409,
    /monthly/,
  );
  state = run(state, { type: "job.confirm", id: state.jobs[0].id });
  assert.equal(state.jobs[0].reserved, 100);
  assert.equal(state.jobs[0].state, "queued");
  assert.equal(
    state.jobs[0].attempt,
    0,
    "Pure engine confirmation never executes a provider request.",
  );
  rejects(
    state,
    { type: "job.confirm", id: state.jobs[0].id },
    400,
    /waiting job/,
  );
});

test("identical idempotent requests cannot duplicate jobs, reservations, notifications, or audit entries", () => {
  let state = fixture();
  const command = jobCommand(state);
  state = run(state, command);
  const previous = structuredClone(state);
  const replay = run(state, command);
  assert.deepEqual(replay, previous);
  assert.equal(replay.jobs.length, 1);
  assert.equal(
    replay.jobs.reduce((sum, job) => sum + job.reserved, 0),
    100,
  );
  rejects(
    state,
    { ...command, prompt: "A different paid request." },
    400,
    /different inputs/,
  );
  rejects(state, { ...command, channel: "Instagram" }, 400, /channel/);
});

test("cancelled queued jobs release reservations while unknown dispatched jobs cannot be blindly retried", () => {
  let state = run(fixture(), jobCommand(fixture()));
  state = run(state, { type: "job.cancel", id: state.jobs[0].id });
  assert.equal(state.jobs[0].state, "cancelled");
  assert.equal(state.jobs[0].reserved, 0);
  const unknown = fixture();
  unknown.jobs = [
    {
      ...state.jobs[0],
      state: "unknown",
      reserved: 100,
      dispatchStartedAt: NOW,
    },
  ];
  rejects(
    unknown,
    { type: "job.cancel", id: unknown.jobs[0].id },
    400,
    /Dispatched or unknown/,
  );
});

test("recurrence configuration and due dates never execute generation without a separate explicit job", () => {
  let state = fixture();
  const before = structuredClone({
    jobs: state.jobs,
    ideas: state.ideas,
    contents: state.contents,
  });
  state = run(state, {
    type: "recurrence.save",
    title: "Weekly ideas",
    channel: "LinkedIn",
    quantity: 3,
    nextAt: "2026-10-26T10:00:00.000Z",
    research: true,
  });
  assert.equal(state.recurrences.length, 1);
  assert.equal(state.recurrences[0].state, "active");
  assert.deepEqual(
    { jobs: state.jobs, ideas: state.ideas, contents: state.contents },
    before,
  );
  state = run(state, { type: "recurrence.pause", id: state.recurrences[0].id });
  assert.equal(state.recurrences[0].state, "paused");
  assert.deepEqual(state.jobs, []);
  rejects(
    state,
    {
      type: "recurrence.save",
      title: "Unauthorized recurrence",
      channel: "LinkedIn",
      quantity: 1,
      nextAt: "2026-11-01T10:00:00.000Z",
      research: true,
    },
    403,
    /permission/,
    viewer,
  );
});

test("Trash uses the fixed 90-day policy, blocks active publication tasks, and retains approval snapshots", () => {
  let state = scheduled();
  assert.equal(state.settings.trashDays, 90);
  const pkg = structuredClone(state.packages[0]);
  rejects(
    state,
    { type: "content.trash", id: state.contents[0].id },
    400,
    /active publication tasks/,
  );
  state = run(state, { type: "schedule.block", id: state.schedules[0].id });
  state = run(state, { type: "content.trash", id: state.contents[0].id });
  assert.equal(state.contents[0].deletedAt, NOW);
  assert.deepEqual(state.packages[0], pkg);
  rejects(
    state,
    saveCommand(state.contents[0], { text: "Edit while trashed." }),
    400,
    /Restore/,
  );
  state = run(state, { type: "content.untrash", id: state.contents[0].id });
  assert.equal(state.contents[0].deletedAt, undefined);
  assert.deepEqual(state.packages[0], pkg);
  rejects(
    state,
    {
      type: "settings.save",
      timezone: "America/New_York",
      trashDays: 30,
      monthlyCap: 10000,
      requestCap: 1000,
      confirmationThreshold: 100,
      currency: "USD",
    },
    400,
    /trashDays/,
  );
});

test("manual publication requires an approved package and trustworthy destination URL and records only human confirmation", () => {
  let state = scheduled();
  const schedule = state.schedules[0];
  assert.equal(schedule.state, "planned");
  assert.equal(schedule.verification, undefined);
  assert.equal(schedule.publicationUrl, undefined);
  for (const url of [
    "http://www.linkedin.com/posts/example",
    "https://linkedin.com.attacker.example/posts/example",
    "https://attacker.example/?target=linkedin.com",
    "https://user:secret@www.linkedin.com/posts/example",
    "javascript:alert(1)",
  ])
    rejects(
      state,
      { type: "schedule.confirm", id: schedule.id, url },
      400,
      /HTTPS|destination/,
    );
  const unapproved = run(fixture(), {
    type: "schedule.create",
    contentId: state.contents[0].id,
    at: "2026-10-30T12:00:00.000Z",
  });
  rejects(
    unapproved,
    {
      type: "schedule.confirm",
      id: unapproved.schedules[0].id,
      url: "https://www.linkedin.com/posts/example",
    },
    400,
    /approved package/,
  );
  state = run(state, {
    type: "schedule.confirm",
    id: schedule.id,
    url: "https://www.linkedin.com/posts/example",
  });
  assert.equal(state.schedules[0].state, "published");
  assert.equal(state.schedules[0].verification, "human_confirmed");
  assert.equal(state.schedules[0].confirmedBy, founder.email);
  assert.equal(state.schedules[0].confirmedAt, NOW);
  assert.equal(
    state.schedules[0].publicationUrl,
    "https://www.linkedin.com/posts/example",
  );
  rejects(
    state,
    {
      type: "schedule.confirm",
      id: schedule.id,
      url: "https://www.linkedin.com/posts/replacement",
    },
    400,
    /retained publication confirmation/,
  );
});

test("approval checks unresolved wording in the title, narration, and captions included in the approved payload", () => {
  for (const field of ["title", "narration", "captions"] as const) {
    const state = fixture();
    if (field === "title")
      state.contents[0].title = "[Ryan to confirm: headline]";
    else
      state.contents[0].media[field] =
        "NEEDS_SOURCE: final spoken or captioned claim.";
    rejects(
      state,
      {
        type: "package.approve",
        contentId: state.contents[0].id,
        expectedRevision: state.contents[0].revision,
      },
      400,
      /Resolve|blocking|confirmation/,
    );
  }
});

for (const gate of [
  "monthly studio",
  "function",
  "user",
  "channel",
  "account",
] as const) {
  test(`${gate} budget includes previous reservations in the same monthly scope`, () => {
    let state = fixture();
    if (gate === "monthly studio") state.settings.monthlyCap = 150;
    if (gate === "function") state.settings.functionCaps.text = 150;
    if (gate === "user") state.settings.userCaps[founder.email] = 150;
    if (gate === "channel") state.settings.channelCaps = { LinkedIn: 150 };
    if (gate === "account")
      state.settings.accountCaps = { [state.contents[0].account]: 150 };
    state = run(state, jobCommand(state));
    rejects(state, jobCommand(state, "second-request"), 409, new RegExp(gate));
  });
}

test("confirming a waiting job in a later month checks the month in which money is reserved", () => {
  let state = fixture();
  state.settings.confirmationThreshold = 50;
  state.settings.monthlyCap = 150;
  state = run(state, jobCommand(state));
  const waiting = state.jobs[0];
  state.jobs.push({
    ...structuredClone(waiting),
    id: "already-reserved-in-november",
    idempotencyKey: "november-request",
    state: "queued",
    reserved: 100,
    period: "2026-11",
    createdAt: "2026-11-01T08:00:00.000Z",
  });
  const before = structuredClone(state);
  assert.throws(
    () =>
      run(state, { type: "job.confirm", id: waiting.id }, founder, {
        ...context,
        now: "2026-11-01T12:00:00.000Z",
      }),
    (error) =>
      error instanceof StudioError &&
      error.code === 409 &&
      /monthly studio/.test(error.message),
  );
  assert.deepEqual(state, before);
});

test("a single job grant matching channel, content, account, and function authorizes exactly that request", () => {
  const state = fixture();
  const content = state.contents[0];
  state.members.find((value) => value.email === editor.email)!.grants = [
    {
      action: "job.create",
      channel: content.channel,
      contentId: content.id,
      account: content.account,
      function: "text",
    },
  ];
  const queued = run(state, jobCommand(state), editor);
  assert.equal(queued.jobs.length, 1);
  assert.equal(queued.jobs[0].createdBy, editor.email);
  assert.equal(queued.jobs[0].reserved, 100);
  rejects(
    state,
    jobCommand(state, "wrong-function", { kind: "image" }),
    403,
    /permission/,
    editor,
  );
});
