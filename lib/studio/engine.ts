import type { Actor, Content, Job, StudioState } from "./types";
import {
  soloPolicy,
  copyIdentity,
  currentCopyAcceptance,
  copyBlockers,
  packageReadiness,
  resolvedConnection,
} from "./solo-quality";
import {
  preparationFor,
  preparationSpend,
  jobPreparation,
} from "./preparation-budget";
import { applyDraftCandidate } from "./draft-candidates";
import { commandSchema } from "./commands";
import { requirePermission, StudioError, memberFor, can } from "./permissions";
import { EMPTY_MEDIA } from "./seed";
import { budgetMonth } from "./time";
import {
  stageSummary,
  currentWorkflow,
  hasVisuals,
  recordIsCurrent,
  factsSignature,
} from "./stages";
import { sampleIdeas, parseGeneratedIdeas } from "./idea-generation";
import { demoPreset, type ChannelPreset } from "./presets";
import { ideaJobInput } from "./idea-generation";
import { contentWording } from "./content-wording";
import { savedResearchSchema } from "./research";
import { review } from "../brand";
export type ExecutionContext = {
  now?: string;
  id?: () => string;
  demo?: boolean;
  hash?: (value: string) => string;
  quotedCost?: number;
  pricingSnapshot?: unknown;
  assetManifest?: unknown[];
  canonicalGeneration?: boolean;
  preset?: ChannelPreset;
};
export function fingerprint(value: unknown) {
  const s = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
function bad(message: string): never {
  throw new StudioError(400, message);
}
export function applyCommand(
  input: StudioState,
  actor: Actor,
  unknown: unknown,
  ctx: ExecutionContext = {},
): StudioState {
  const parsed = commandSchema.safeParse(unknown);
  if (!parsed.success)
    throw new StudioError(
      400,
      "Invalid command: " +
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join("; "),
    );
  const c = parsed.data,
    s = structuredClone(input),
    now = ctx.now || new Date().toISOString(),
    id = ctx.id || (() => crypto.randomUUID());
  memberFor(s, actor);
  const need = (action: string, scope = {}) =>
    requirePermission(s, actor, action, scope);
  const content = (key: string, action = "content.edit") => {
    const d = s.contents.find((x) => x.id === key);
    if (!d) throw new StudioError(404, "Content not found.");
    need(action, {
      channel: d.channel,
      account: d.account,
      contentId: d.id,
      assignedTo: d.assignedTo,
    });
    return d;
  };
  const notify = (
    user: string,
    title: string,
    body: string,
    eventId: string,
  ) => {
    if (!s.notices.some((n) => n.eventId === eventId && n.user === user))
      s.notices.push({
        id: id(),
        user,
        title,
        body,
        eventId,
        read: false,
        createdAt: now,
        emailState: "not_configured",
      });
  };
  const remember = (d: Content, reason: string) => {
    d.history.push({
      id: id(),
      text: d.text,
      title: d.title,
      metadata: d.metadata,
      media: structuredClone(d.media),
      createdBy: actor.email,
      createdAt: now,
      reason,
    });
    d.revision++;
    d.state = "draft";
    d.updatedAt = now;
  };
  const jobFor = (key: string) => {
    const j = s.jobs.find((j) => j.id === key);
    if (!j) throw new StudioError(404, "Job not found.");
    need("job.create", {
      channel: j.channel,
      function: j.kind,
      contentId: j.contentId,
      account: j.account,
      assignedTo: s.contents.find((d) => d.id === j.contentId)?.assignedTo,
    });
    return j;
  };
  const reserve = (j: Job) => {
    const connection = s.connections.find((c) => c.id === j.connectionId);
    if (
      connection?.status === "disconnected" ||
      (!ctx.demo && (!connection?.hasKey || connection.status !== "validated"))
    )
      bad(
        "Validate a connected provider credential before reserving generation.",
      );
    if (j.preparationId) {
      const authorization = jobPreparation(s, j, now);
      if (!authorization)
        bad(
          "Package budget authorization changed or expired; reauthorize before spending.",
        );
      if (
        preparationSpend(s, authorization.id, j.id) + j.estimate >
        authorization.maxCents
      )
        bad(
          "The total package budget is exhausted. Ask the founder to increase it; no provider request was started.",
        );
    }
    const period = budgetMonth(now, s.settings.timezone),
      monthly = s.jobs.filter((x) => x.period === period && x.id !== j.id),
      amount = j.estimate;
    const used = (xs: Job[]) =>
      xs.reduce((sum, x) => sum + (x.actual ?? x.reserved), 0);
    const gates: [number | undefined, Job[], string][] = [
      [s.settings.monthlyCap, monthly, "monthly studio"],
      [s.settings.requestCap, [], "per-request"],
      [
        s.settings.functionCaps[j.kind],
        monthly.filter((x) => x.kind === j.kind),
        "function",
      ],
      [
        s.settings.userCaps[j.createdBy],
        monthly.filter((x) => x.createdBy === j.createdBy),
        "user",
      ],
      [
        s.settings.channelCaps?.[j.channel],
        monthly.filter((x) => x.channel === j.channel),
        "channel",
      ],
      [
        j.account ? s.settings.accountCaps?.[j.account] : undefined,
        monthly.filter((x) => x.account === j.account),
        "account",
      ],
    ];
    const ownerRoles =
      s.members.find((m) => m.email === j.createdBy)?.roles || [];
    for (const role of ownerRoles) {
      const records = monthly.filter((x) =>
        (
          (x as Job & { rolesSnapshot?: string[] }).rolesSnapshot ||
          s.members.find((m) => m.email === x.createdBy)?.roles ||
          []
        ).includes(role),
      );
      gates.push([s.settings.roleCaps?.[role], records, `role ${role}`]);
    }
    const project = (j as Job & { project?: string }).project;
    if (project)
      gates.push([
        s.settings.projectCaps?.[project],
        monthly.filter(
          (x) => (x as Job & { project?: string }).project === project,
        ),
        "project",
      ]);
    for (const [cap, records, label] of gates) {
      if (cap === undefined) continue;
      if (cap === 0 || used(records) + amount > cap)
        throw new StudioError(
          409,
          `${label} spending limit blocks this job. Ask an authorized administrator to change the budget.`,
        );
    }
    if (!s.settings.monthlyCap || !s.settings.requestCap || !amount)
      bad(
        "Configure a priced request allowance and non-zero spending limits before generation.",
      );
    j.reserved = amount;
    j.period = period;
    Object.assign(j, { rolesSnapshot: ownerRoles });
    j.state = "queued";
  };
  function taskAccess(t: {
    kind: string;
    contentId?: string;
    workflowId?: string;
    channel: string;
  }) {
    if (t.kind === "workflow") {
      const workflow = s.workflows.find(
        (w) => w.id === t.workflowId && w.channel === t.channel,
      );
      if (!workflow) bad("Select an existing workflow for this channel.");
      need("workflow.edit", { channel: workflow.channel });
    } else {
      if (!t.contentId) bad("Select the draft to plan.");
      const draft = content(t.contentId!);
      if (draft.deletedAt || draft.channel !== t.channel)
        bad("Select an available draft in the matching channel.");
    }
  }
  switch (c.type) {
    case "research.saveReference": {
      const job = jobFor(c.jobId);
      if (job.contentId) {
        const parent = s.contents.find((d) => d.id === job.contentId);
        if (
          !parent ||
          parent.deletedAt ||
          !can(s, actor, "read", {
            channel: parent.channel,
            contentId: parent.id,
            account: parent.account,
            assignedTo: parent.assignedTo,
          })
        )
          throw new StudioError(
            403,
            "Source content access changed. Cannot import this retained result.",
          );
      }
      need("reference.edit", { channel: job.channel });
      if (job.createdBy !== actor.email && !can(s, actor, "users.manage"))
        throw new StudioError(
          403,
          "This research result belongs to another member.",
        );
      if (job.kind !== "research" || job.state !== "succeeded" || !job.result)
        bad("Choose a completed research result.");
      let parsed;
      try {
        parsed = savedResearchSchema.safeParse(JSON.parse(job.result!));
      } catch {
        bad(
          "Saved research is not valid cited evidence. Review the raw result.",
        );
      }
      if (!parsed!.success)
        bad(
          "Research has missing sources or tool errors. It cannot be represented as cited evidence.",
        );
      if (s.references.some((r) => r.sourceJobId === job.id))
        return structuredClone(input);
      s.references.unshift({
        id: id(),
        title: c.title,
        channel: job.channel,
        kind: "source",
        content: job.result!,
        createdAt: now,
        sourceJobId: job.id,
      });
      break;
    }
    case "connection.disconnect":
    case "connection.delete":
    case "connection.allowance": {
      const connection = s.connections.find((x) => x.id === c.id);
      if (!connection) bad("Connection not found.");
      need("connections.manage", { function: connection.function });
      if (connection.updatedAt !== c.expectedUpdatedAt)
        throw new StudioError(
          409,
          "Connection changed. Refresh before continuing.",
        );
      if (
        s.jobs.some(
          (j) =>
            j.connectionId === c.id &&
            ["queued", "awaiting_confirmation", "running", "unknown"].includes(
              j.state,
            ),
        )
      )
        bad(
          "Cancel waiting jobs or reconcile running/unknown jobs before changing this connection.",
        );
      if (c.type === "connection.delete") {
        if (
          s.jobs.some((j) => j.connectionId === c.id) ||
          s.workflows.some(
            (w) =>
              w.connectionId === c.id ||
              Object.values(w.functionConnections || {}).includes(c.id),
          )
        )
          bad(
            "This connection has job history or workflow references. Disconnect it instead to retain its history.",
          );
        s.connections = s.connections.filter((x) => x.id !== c.id);
      } else if (c.type === "connection.disconnect") {
        connection.status = "disconnected";
        connection.hasKey = false;
        connection.updatedAt = now;
      } else {
        if (connection.status === "disconnected")
          bad(
            "Add a replacement before configuring a disconnected connection.",
          );
        Object.assign(connection, {
          maxRequestCost: c.maxRequestCost,
          updatedAt: now,
        });
      }
      break;
    }
    case "idea.importSavedResult": {
      const job = jobFor(c.jobId);
      if (job.contentId) {
        const parent = s.contents.find((d) => d.id === job.contentId);
        if (
          !parent ||
          parent.deletedAt ||
          !can(s, actor, "read", {
            channel: parent.channel,
            contentId: parent.id,
            account: parent.account,
            assignedTo: parent.assignedTo,
          })
        )
          throw new StudioError(
            403,
            "Source content access changed. Cannot import this retained result.",
          );
      }
      need("idea.edit", { channel: job.channel });
      if (job.createdBy !== actor.email && !can(s, actor, "users.manage"))
        throw new StudioError(
          403,
          "You cannot import another member's private job result.",
        );
      if (job.kind !== "ideas" || job.state !== "succeeded" || !job.result)
        bad(
          "Select a completed Ideas job with a saved provider result. No provider request was made.",
        );
      if (s.ideas.some((i) => i.generationRunId === job.id))
        return structuredClone(input);
      let items: ReturnType<typeof parseGeneratedIdeas>;
      try {
        items = parseGeneratedIdeas(job.result!);
      } catch {
        bad(
          "The saved result still does not match the complete idea-card format. No partial cards were imported and no provider request was made.",
        );
      }
      for (const item of items!)
        s.ideas.unshift({
          ...item,
          id: id(),
          channel: job.channel,
          state: "pending",
          origin: "agent",
          generationRunId: job.id,
          createdBy: job.createdBy,
          createdAt: now,
        });
      job.error =
        "Saved response imported without another provider request. Budget reservation is unchanged pending billing reconciliation.";
      break;
    }
    case "task.create": {
      taskAccess(c);
      if (
        (c.kind === "workflow" && c.contentId) ||
        (c.kind !== "workflow" && c.workflowId)
      )
        bad("Choose one task target.");
      if (Date.parse(c.at) <= Date.parse(now))
        bad("Choose a future task time.");
      s.planningTasks ??= [];
      const { type: _commandType, ...taskData } = c;
      s.planningTasks.unshift({
        ...taskData,
        id: id(),
        owner: actor.email,
        state: "planned",
        createdBy: actor.email,
        createdAt: now,
      });
      break;
    }
    case "task.update": {
      const task = s.planningTasks?.find((t) => t.id === c.id);
      if (!task) bad("Planning task not found.");
      taskAccess(task!);
      if (c.at && Date.parse(c.at) <= Date.parse(now))
        bad("Choose a future task time.");
      if (c.at) task!.at = c.at;
      if (c.state) task!.state = c.state;
      break;
    }
    case "stage.decide": {
      const d = s.contents.find((d) => d.id === c.contentId);
      if (!d) bad("Content not found.");
      const scope = {
        channel: d.channel,
        account: d.account,
        contentId: d.id,
        assignedTo: d.assignedTo,
      };
      const permission =
        c.stage === "intake" || c.stage === "creation"
          ? "content.edit"
          : c.stage === "handoff"
            ? "schedule.manage"
            : "stage.review";
      if (permission === "stage.review" && !can(s, actor, permission, scope))
        need("package.approve", scope);
      else need(permission, scope);
      if (d.deletedAt) bad("Restore this content before recording checks.");
      if (
        d.revision !== c.expectedRevision ||
        currentWorkflow(d, s)?.id !== c.expectedWorkflowId ||
        s.settings.protectedVersion !== c.expectedRuleVersion
      )
        throw new StudioError(
          409,
          "The draft, workflow or protected rules changed. Review the current versions before recording a check.",
        );
      if (c.status === "na" && (c.stage !== "visual_review" || hasVisuals(d)))
        bad(
          "N/A is permitted only for visual review of a genuinely text-only format, with a reason.",
        );
      if (
        ["evidence", "independent_review", "release_check"].includes(c.stage) &&
        c.evidence.trim().length < 10
      )
        bad(
          "Record source/reviewer evidence, or a reasoned no-external-claims declaration.",
        );
      if (
        c.stage === "creation" &&
        c.status === "pass" &&
        !d.text.trim() &&
        !d.media.slides.length &&
        !d.media.scenes.length
      )
        bad("Create the draft before marking creation complete.");
      const summary = stageSummary(d, s),
        index = summary.stages.findIndex((stage) => stage.key === c.stage);
      if (
        ["pass", "na"].includes(c.status) &&
        summary.stages
          .slice(0, index)
          .some((stage) => !["pass", "na"].includes(stage.status))
      )
        bad(
          "Complete the preceding required stages before passing this stage.",
        );
      if (
        c.stage === "handoff" &&
        (!c.packageId || c.packageId !== summary.packageId)
      )
        throw new StudioError(
          409,
          "Handoff must refer to the exact current approved package.",
        );
      d.stages ??= [];
      d.stages.push({
        key: c.stage,
        status: c.status,
        reason: c.reason,
        evidence: c.evidence,
        actor: actor.email,
        at: now,
        textRevision: d.textRevision || 1,
        mediaRevision: d.mediaRevision || 1,
        factsRevision: d.factsRevision ?? d.textRevision ?? 1,
        workflowId: c.expectedWorkflowId,
        ruleVersion: c.expectedRuleVersion,
        packageId: c.packageId,
      });
      if (["revise", "hold"].includes(c.status)) {
        d.state = "changes";
        for (const stage of summary.stages
          .slice(index + 1)
          .filter(
            (x) => !["human_approval", "publication_record"].includes(x.key),
          ))
          d.stages.push({
            key: stage.key,
            status: "pending",
            reason: "An earlier check was revised or held.",
            evidence: "",
            actor: actor.email,
            at: now,
            textRevision: d.textRevision || 1,
            mediaRevision: d.mediaRevision || 1,
            factsRevision: d.factsRevision ?? d.textRevision ?? 1,
            workflowId: c.expectedWorkflowId,
            ruleVersion: c.expectedRuleVersion,
          });
      }
      break;
    }
    case "idea.generate": {
      need("idea.edit", { channel: c.channel });
      need("job.create", { channel: c.channel, function: "ideas" });
      if (
        s.audit.some(
          (e) =>
            e.action === "idea.sample_batch" && e.target === c.idempotencyKey,
        )
      )
        return structuredClone(input);
      if (ctx.demo) {
        for (const item of sampleIdeas(
          c.channel,
          c.topic,
          c.quantity,
          c.audience,
        ))
          s.ideas.unshift({
            ...item,
            id: id(),
            channel: c.channel,
            state: "pending",
            origin: "demo_sample",
            generationRunId: "sample:" + c.idempotencyKey,
            createdBy: actor.email,
            createdAt: now,
          });
        s.audit.push({
          id: id(),
          actor: actor.email,
          action: "idea.sample_batch",
          target: c.idempotencyKey,
          at: now,
        });
        break;
      }
      if (c.research)
        throw new StudioError(
          503,
          "Inline research-to-ideas is not qualified. Run a separately qualified Claude Research job, review and save its cited result as a reference, then attach it to a reviewed workflow. No request was started.",
        );
      const jobInput = ideaJobInput(s, actor, c);
      return applyCommand(input, actor, jobInput, ctx);
    }
    case "workflow.importPreset": {
      need("workflow.edit", { channel: c.channel });
      const preset = ctx.demo ? demoPreset(c.channel) : ctx.preset;
      if (!preset) bad("The channel preset could not be loaded.");
      const refs: string[] = [];
      for (const ref of preset.references) {
        const existing = s.references.find(
          (r) =>
            r.title === ref.title &&
            r.content === ref.content &&
            (r.channel === c.channel || r.channel === "Shared"),
        );
        if (existing) {
          refs.push(existing.id);
          continue;
        }
        const refId = id();
        s.references.push({
          id: refId,
          title: ref.title,
          content: ref.content,
          kind: ref.kind,
          channel: c.channel,
          createdAt: now,
        });
        refs.push(refId);
      }
      s.workflows.unshift({
        id: id(),
        channel: c.channel,
        version:
          Math.max(
            0,
            ...s.workflows
              .filter((w) => w.channel === c.channel)
              .map((w) => w.version),
          ) + 1,
        status: "draft",
        title: `${c.channel} imported channel package`,
        audience: "Choose the intended audience",
        instructions:
          "Use this channel template for intent, voice and deliverables. Latest protected founder policy and explicit scoped decisions take precedence over legacy CTA, identity, pricing or approval defaults. This is a reviewed configuration template, not permission to execute uploaded scripts.\n\n" +
          preset.instructions,
        guardrails:
          "Human final approval. No misinformation or misrepresentation. Do not activate conflicting legacy defaults. Keep internal brand evidence private.",
        references: refs,
        examples: "",
        outputFormat:
          "Use the channel artifact definitions in the selected references.",
        checks:
          "Nine stages; explicit human records; exact text and media package; no invented sources, experiences, or approval evidence.",
        connectionId: "",
        functionConnections: {},
        createdBy: actor.email,
        createdAt: now,
      });
      break;
    }

    case "idea.create":
      need("idea.edit", { channel: c.channel });
      s.ideas.unshift({
        id: id(),
        title: c.title,
        brief: c.brief,
        channel: c.channel,
        state: "pending",
        createdBy: actor.email,
        createdAt: now,
        sources: [],
      });
      break;
    case "idea.review": {
      const idea = s.ideas.find((i) => i.id === c.id);
      if (!idea) bad("Idea not found.");
      need("idea.review", { channel: idea.channel });
      if (c.decision === "rejected" && !c.reason?.trim())
        bad("A rejection category is required.");
      idea.state = c.decision;
      idea.rejection = c.decision === "rejected" ? c.reason : undefined;
      break;
    }
    case "idea.reuse": {
      const idea = s.ideas.find((i) => i.id === c.id);
      if (!idea || idea.state !== "rejected")
        bad("Select a rejected idea to reuse.");
      need("idea.edit", { channel: idea.channel });
      s.ideas.unshift({
        ...structuredClone(idea),
        id: id(),
        title: idea.title + " — revised",
        state: "pending",
        rejection: undefined,
        sourceId: idea.id,
        createdBy: actor.email,
        createdAt: now,
        brief:
          idea.brief +
          (c.mode === "revise"
            ? "\nRevision requested; select a configured agent to generate a proposal."
            : ""),
      });
      break;
    }
    case "idea.use": {
      const idea = s.ideas.find((i) => i.id === c.id);
      if (!idea) bad("Idea not found.");
      need("read", { channel: idea.channel });
      if (idea.state !== "approved") {
        need("idea.review", { channel: idea.channel });
        idea.state = "approved";
      }
      need("content.create", { channel: idea.channel, account: c.account });
      const existing = s.contents.find(
        (d) =>
          d.ideaId === idea.id && d.createdBy === actor.email && !d.deletedAt,
      );
      if (existing) {
        content(existing.id);
        break;
      }
      const d: Content = {
        id: id(),
        channel: idea.channel,
        account: c.account || "RyzaLab",
        title: idea.title,
        format: c.format,
        text: "",
        metadata: "",
        media: structuredClone(EMPTY_MEDIA),
        ideaId: idea.id,
        assignedTo: actor.email,
        revision: 1,
        textRevision: 1,
        mediaRevision: 1,
        factsRevision: 1,
        history: [],
        state: "draft",
        workflowId: s.workflows.find(
          (w) => w.channel === idea.channel && w.status === "active",
        )?.id,
        createdBy: actor.email,
        updatedAt: now,
      };
      s.contents.unshift(d);
      const policy = soloPolicy(s);
      if (
        policy &&
        can(s, actor, "package.approve", {
          channel: d.channel,
          contentId: d.id,
          account: d.account,
          assignedTo: d.assignedTo,
        })
      ) {
        const authorization = {
          id: id(),
          contentId: d.id,
          channel: d.channel,
          account: d.account,
          authorizedFor: d.assignedTo,
          authorizedBy: actor.email,
          at: now,
          period: budgetMonth(now, s.settings.timezone),
          maxCents: policy.packageCap,
          functions: [
            "text",
            "research",
            "review",
            "image",
            "audio",
            "video",
          ] as import("./types").FunctionKind[],
          policyVersion: policy.version,
        };
        s.preparations ??= [];
        s.preparations.push(authorization);
        d.preparationId = authorization.id;
      }
      break;
    }
    case "content.create": {
      need("content.create", { channel: c.channel, account: c.account });
      if (
        c.ideaId &&
        !s.ideas.some((i) => i.id === c.ideaId && i.state === "approved")
      )
        bad("Select an approved idea or start a blank draft.");
      s.contents.unshift({
        id: id(),
        channel: c.channel,
        account: c.account || "RyzaLab",
        title: c.title,
        format: c.format,
        text: "",
        metadata: "",
        media: structuredClone(EMPTY_MEDIA),
        ideaId: c.ideaId,
        assignedTo: actor.email,
        revision: 1,
        textRevision: 1,
        mediaRevision: 1,
        factsRevision: 1,
        history: [],
        state: "draft",
        workflowId: s.workflows.find(
          (w) => w.channel === c.channel && w.status === "active",
        )?.id,
        createdBy: actor.email,
        updatedAt: now,
      });
      break;
    }
    case "content.save": {
      const d = content(c.id);
      if (d.deletedAt) bad("Restore this item before editing.");
      if (d.revision !== c.expectedRevision)
        throw new StudioError(
          409,
          "This draft changed. Reload before saving so no edits are lost.",
        );
      if (c.account !== undefined && c.account !== d.account)
        need("content.edit", {
          channel: d.channel,
          account: c.account,
          contentId: d.id,
          assignedTo: d.assignedTo,
        });
      const priorWords = contentWording(d);
      const oldFacts = factsSignature(d),
        oldFactsRevision = d.factsRevision ?? d.textRevision ?? 1,
        oldTitle = d.title;
      const mediaChanged =
          JSON.stringify(d.media) !== JSON.stringify(c.media) ||
          (c.format !== undefined && c.format !== d.format),
        textChanged =
          d.text !== c.text ||
          d.title !== c.title ||
          d.metadata !== c.metadata ||
          (c.account !== undefined && c.account !== d.account) ||
          (c.format !== undefined && c.format !== d.format);
      remember(d, "Studio edit");
      Object.assign(d, {
        title: c.title,
        text: c.text,
        metadata: c.metadata,
        media: c.media,
        format: c.format || d.format,
        account: c.account ?? d.account,
        collection: c.collection ?? d.collection,
        textRevision: (d.textRevision || 1) + (textChanged ? 1 : 0),
        mediaRevision: (d.mediaRevision || 1) + (mediaChanged ? 1 : 0),
      });
      if (!textChanged && priorWords !== contentWording(d))
        d.textRevision = (d.textRevision || 1) + 1;
      d.factsRevision =
        oldFactsRevision + (oldFacts !== factsSignature(d) ? 1 : 0);
      if (oldTitle !== d.title && d.stages?.length)
        d.stages.push({
          key: "intake",
          status: "pending",
          reason: "The topic/title changed.",
          evidence: "",
          actor: actor.email,
          at: now,
          textRevision: d.textRevision || 1,
          mediaRevision: d.mediaRevision || 1,
          factsRevision: d.factsRevision,
          workflowId: currentWorkflow(d, s)?.id || "",
          ruleVersion: s.settings.protectedVersion,
        });
      break;
    }
    case "content.submit": {
      const d = content(c.id);
      if (!d.text.trim() && !d.media.slides.length && !d.media.scenes.length)
        bad("Add content before submitting.");
      d.state = "review";
      const owner =
        s.members.find((m) => m.roles.includes("founder") && !m.revoked) ||
        s.members.find((m) => m.roles.includes("administrator") && !m.revoked);
      if (owner)
        notify(
          owner.email,
          "Human review requested",
          d.title,
          `review:${d.id}:${d.revision}`,
        );
      break;
    }
    case "content.restore": {
      const old = content(c.id);
      const r = old.history.find((r) => r.id === c.revisionId);
      if (!r) bad("Revision not found.");
      s.contents.unshift({
        ...structuredClone(old),
        id: id(),
        title: r.title + " — restored",
        copyAcceptances: [],
        agentReview: undefined,
        preparationId: undefined,
        text: r.text,
        metadata: r.metadata,
        media: structuredClone(r.media),
        revision: 1,
        textRevision: 1,
        mediaRevision: 1,
        factsRevision: 1,
        history: [],
        state: "draft",
        deletedAt: undefined,
        createdBy: actor.email,
        assignedTo: actor.email,
        updatedAt: now,
        docId: undefined,
        docsBase: undefined,
        docsFetchedAt: undefined,
        docsOwnerId: undefined,
        docsOwnerEmail: undefined,
        docsLastCheckedAt: undefined,
        docsSyncError: undefined,
        docsIncoming: undefined,
        stages: [],
      });
      break;
    }
    case "content.trash": {
      const d = content(c.id);
      if (
        s.schedules.some((x) => x.contentId === d.id && x.state === "planned")
      )
        bad(
          "Resolve active publication tasks before moving this content to Trash.",
        );
      if (
        s.planningTasks?.some(
          (t) => t.contentId === d.id && t.state === "planned",
        )
      )
        bad(
          "Resolve active planning tasks before moving this content to Trash.",
        );
      d.deletedAt = now;
      break;
    }
    case "content.untrash": {
      const d = content(c.id);
      delete d.deletedAt;
      break;
    }
    case "content.assign": {
      const d = content(c.id, "content.assign");
      if (!s.members.some((m) => m.email === c.email && !m.revoked))
        bad("Assign an active Studio member.");
      d.assignedTo = c.email;
      break;
    }
    case "package.approve": {
      const d = content(c.contentId, "package.approve");
      if (d.deletedAt) bad("Trashed content cannot be approved.");
      if (d.revision !== c.expectedRevision)
        throw new StudioError(
          409,
          "The content changed after review. Open the current revision before approving.",
        );
      if (!d.text.trim()) bad("Add final written content before approval.");
      const all = contentWording(d);
      const check = review(all, "general");
      const blockers = check.issues
        .filter((x) => x.severity === "BLOCK")
        .map((x) => `${x.id}: ${x.message}`);
      const placeholders = [
        ...all.matchAll(/\[(?:Ryan|source|confirm|verify)[^\]]*\]/gi),
      ]
        .slice(0, 3)
        .map((match) => `Unresolved placeholder: ${match[0].slice(0, 300)}`);
      if (/\bNEEDS_SOURCE\b/.test(all))
        placeholders.push(
          "NEEDS_SOURCE remains in the content; supply verified evidence or remove the unsupported claim.",
        );
      if (blockers.length || placeholders.length)
        bad(
          "Resolve blocking factual claims and confirmation placeholders before approval. " +
            [...blockers, ...placeholders].slice(0, 8).join(" "),
        );
      const priceLines = all
        .split("\n")
        .filter((line) => /\bfree\b|\$\s*\d/i.test(line));
      if (
        priceLines.some(
          (line) =>
            !(s.exceptions || []).some(
              (e) =>
                e.contentId === d.id &&
                e.revision === d.revision &&
                e.ruleVersion === s.settings.protectedVersion &&
                e.wording === line.trim(),
            ),
        )
      )
        bad(
          "Price/free wording requires a scoped founder exception for each exact line in this revision.",
        );
      if (d.media.scenes.length && d.media.scenes.some((x) => !x.sourceUrl))
        bad(
          "Video approval requires completed scene media, not only a script.",
        );
      const workflow = s.workflows.find(
        (w) => w.channel === d.channel && w.status === "active",
      );
      if (!workflow) bad("Activate a channel workflow before approval.");
      if (
        c.expectedWorkflowId !== workflow.id ||
        c.expectedRuleVersion !== s.settings.protectedVersion
      )
        throw new StudioError(
          409,
          "Workflow or protected rules changed. Review the current versions before approving.",
        );
      const assets = [
        d.media.imageUrl,
        ...d.media.slides.map((x) => x.image),
        ...d.media.scenes.flatMap((x) => [x.sourceUrl, x.audioUrl]),
      ].filter(Boolean) as string[];
      if (
        assets.some(
          (url) =>
            !/^\/api\/studio\/assets\?id=[0-9a-f-]{36}$/i.test(url) &&
            !(
              ctx.demo &&
              /^data:(image\/(png|jpeg|webp)|video\/mp4|audio\/(mpeg|wav));base64,/i.test(
                url,
              )
            ),
        )
      )
        bad(
          "Approval requires immutable uploaded Studio media, not mutable external URLs.",
        );
      const twoStep = soloPolicy(s);
      const readiness = twoStep ? packageReadiness(d, s) : undefined;
      if (twoStep) {
        if (
          c.expectedPolicyVersion !== twoStep.version ||
          c.expectedCopyAcceptanceId !== readiness?.acceptance?.id
        )
          throw new StudioError(
            409,
            "Copy acceptance or review policy changed. Open the latest package before approval.",
          );
        if (!readiness?.ready)
          bad(
            readiness?.blockers.join(" ") ||
              "Complete copy and package checks.",
          );
        if (d.channel === "Notes") {
          need("policy.manage");
          if (!c.authorizeNote)
            bad(
              "Founder release authorization is required for this exact Note source and assets.",
            );
        }
        if (!c.handoff)
          bad("Explicitly approve this exact package and its manual handoff.");
      }
      if (!twoStep && !stageSummary(d, s).readyForApproval)
        bad(
          "Complete all six pre-approval stages for this exact version before human approval.",
        );
      const payload = {
        contentId: d.id,
        channel: d.channel,
        account: d.account,
        title: d.title,
        revision: d.revision,
        textRevision: d.textRevision || 1,
        mediaRevision: d.mediaRevision || 1,
        text: d.text,
        metadata: d.metadata,
        media: structuredClone(d.media),
        workflowId: workflow.id,
        ruleVersion: s.settings.protectedVersion,
        ...{
          stagesSnapshot: (d.stages || []).filter((record) =>
            recordIsCurrent(record, d, s),
          ),
          assetManifest: ctx.assetManifest || [],
          exceptionSnapshots: (s.exceptions || []).filter(
            (e) => e.contentId === d.id && e.revision === d.revision,
          ),
          ...(twoStep
            ? {
                reviewPolicySnapshot: structuredClone(twoStep),
                copyAcceptanceSnapshot: structuredClone(readiness!.acceptance),
                agentReviewSnapshot: readiness?.agent
                  ? structuredClone(readiness.agent)
                  : null,
                qualityReport: packageReadiness(d, s),
                noteReleaseAuthorization:
                  d.channel === "Notes"
                    ? {
                        by: actor.email,
                        at: now,
                        contentId: d.id,
                        revision: d.revision,
                        workflowId: workflow.id,
                        sourceIdentity: copyIdentity(d, s),
                        assetManifest: ctx.assetManifest || [],
                      }
                    : null,
              }
            : {}),
          rulesSnapshot: s.settings.protectedRules,
          workflowSnapshot: structuredClone(workflow),
          referenceSnapshots: s.references
            .filter((r) => workflow.references.includes(r.id))
            .map((r) => structuredClone(r)),
        },
      };
      s.packages.unshift({
        ...payload,
        id: id(),
        textId: `${d.id}:text:${d.textRevision || 1}`,
        mediaId: `${d.id}:media:${d.mediaRevision || 1}`,
        approvedBy: actor.email,
        approvedAt: now,
        hash: ctx.hash
          ? ctx.hash(JSON.stringify(payload))
          : fingerprint(payload),
      });
      if (twoStep) {
        const pkg = s.packages[0];
        d.stages ??= [];
        d.stages.push({
          key: "handoff",
          status: "pass",
          reason:
            "Human approved this exact package and its manual handoff in final review.",
          evidence: `Approved package ${pkg.id}`,
          actor: actor.email,
          at: now,
          textRevision: d.textRevision || 1,
          mediaRevision: d.mediaRevision || 1,
          factsRevision: d.factsRevision,
          workflowId: workflow.id,
          ruleVersion: s.settings.protectedVersion,
          packageId: pkg.id,
        });
        if (d.channel === "Notes")
          s.audit.push({
            id: id(),
            actor: actor.email,
            action: "note.release_authorized",
            target: pkg.id,
            at: now,
          });
      }
      break;
    }
    case "package.reject": {
      const d = content(c.contentId, "package.approve");
      d.state = "changes";
      notify(
        d.assignedTo,
        "Changes requested",
        c.reason,
        `changes:${d.id}:${d.revision}`,
      );
      break;
    }
    case "schedule.create": {
      const d = content(c.contentId, "schedule.manage");
      if (d.deletedAt) bad("Restore this content first.");
      if (
        c.packageId &&
        !s.packages.some(
          (p) =>
            p.id === c.packageId &&
            p.contentId === d.id &&
            p.account === d.account,
        )
      )
        bad("Select an approved package for this content and account.");
      s.schedules.push({
        id: id(),
        contentId: d.id,
        packageId: c.packageId,
        at: c.at,
        groupId: c.groupId,
        owner: d.assignedTo,
        state: "planned",
      });
      break;
    }
    case "schedule.move": {
      const item = s.schedules.find((x) => x.id === c.id);
      if (!item) bad("Publication task not found.");
      const affected = s.schedules.filter(
        (x) => x.id === c.id || (item.groupId && x.groupId === item.groupId),
      );
      for (const x of affected) {
        content(x.contentId, "schedule.manage");
        if (x.state === "published")
          bad("A group containing published tasks cannot be moved.");
      }
      const delta = Date.parse(c.at) - Date.parse(item.at);
      for (const x of affected) {
        x.at = new Date(Date.parse(x.at) + delta).toISOString();
        x.state = "planned";
      }
      break;
    }
    case "schedule.replace": {
      const item = s.schedules.find((x) => x.id === c.id);
      if (!item) bad("Publication task not found.");
      const d = content(item.contentId, "schedule.manage");
      if (item.state === "published")
        bad(
          "Published confirmations are retained; create a new correction task.",
        );
      if (item.packageId !== c.expectedPackageId)
        throw new StudioError(
          409,
          "The selected package changed. Refresh and compare before replacement.",
        );
      if (
        !s.packages.some(
          (p) =>
            p.id === c.packageId &&
            p.contentId === d.id &&
            p.account === d.account,
        )
      )
        bad("Package does not match this content/account.");
      item.packageId = c.packageId;
      break;
    }
    case "schedule.confirm": {
      const item = s.schedules.find((x) => x.id === c.id);
      if (!item) bad("Publication task not found.");
      const d = content(item.contentId, "publication.confirm");
      if (item.state === "published")
        bad("This task already has a retained publication confirmation.");
      if (item.state === "blocked")
        bad("Reschedule the blocked task before publication confirmation.");
      if (
        !s.packages.some(
          (p) =>
            p.id === item.packageId &&
            p.contentId === d.id &&
            p.account === d.account,
        )
      )
        bad("Select an approved package before confirming publication.");
      if (item.packageId !== c.expectedPackageId)
        throw new StudioError(
          409,
          "The selected publication package changed. Compare the package you published before confirming.",
        );
      const selectedPackage = s.packages.find((p) => p.id === item.packageId)!;
      const handoff = [...(d.stages || [])]
        .reverse()
        .find(
          (r) =>
            r.key === "handoff" &&
            (r.packageId === selectedPackage.id ||
              (!r.packageId &&
                r.textRevision === selectedPackage.textRevision &&
                r.mediaRevision === selectedPackage.mediaRevision)),
        );
      if (
        !handoff ||
        handoff.status !== "pass" ||
        handoff.packageId !== selectedPackage.id
      )
        bad(
          "Record a passed publication handoff for the exact selected approved package before confirming publication.",
        );
      const u = new URL(c.url);
      if (u.protocol !== "https:" || u.username || u.password)
        bad("Use an HTTPS publication URL without credentials.");
      const domains: Record<string, string[]> = {
        LinkedIn: ["linkedin.com"],
        Instagram: ["instagram.com"],
        TikTok: ["tiktok.com"],
        Facebook: ["facebook.com", "fb.com"],
        YouTube: ["youtube.com", "youtu.be"],
        Reddit: ["reddit.com"],
        Notes: ["ryzalab.com"],
        Newsletter: ["kit.com", "convertkit.com", "ryzalab.com"],
      };
      if (
        domains[d.channel] &&
        !domains[d.channel].some(
          (h) => u.hostname === h || u.hostname.endsWith("." + h),
        )
      )
        bad("The URL does not match the selected destination.");
      Object.assign(item, {
        state: "published",
        publicationUrl: u.href,
        confirmedBy: actor.email,
        confirmedAt: now,
        verification: "human_confirmed",
      });
      break;
    }
    case "schedule.block": {
      const item = s.schedules.find((x) => x.id === c.id);
      if (!item) bad("Publication task not found.");
      content(item.contentId, "schedule.manage");
      if (item.state === "published")
        bad("A published task cannot be blocked.");
      item.state = "blocked";
      notify(
        item.owner,
        "Publication task blocked",
        "Resolve readiness and explicitly reschedule this task.",
        `blocked:${item.id}:${item.at}`,
      );
      break;
    }
    case "workflow.save": {
      need("workflow.edit", { channel: c.channel });
      if (
        c.references.some(
          (r) =>
            !s.references.some(
              (x) =>
                x.id === r &&
                (x.channel === "Shared" || x.channel === c.channel),
            ),
        )
      )
        bad("Reference does not belong to this channel.");
      const existing = c.id
        ? s.workflows.find((w) => w.id === c.id)
        : undefined;
      if (c.id && (!existing || existing.channel !== c.channel))
        bad("Select an existing workflow in this channel.");
      if (c.id && !c.expectedUpdatedAt)
        bad(
          "Refresh the workflow before editing; an edit timestamp is required.",
        );
      if (
        existing &&
        c.expectedUpdatedAt &&
        (existing.updatedAt || existing.createdAt) !== c.expectedUpdatedAt
      )
        throw new StudioError(
          409,
          "Workflow changed while editing. Refresh before saving.",
        );
      const { type: _, id: _id, expectedUpdatedAt: _expected, ...data } = c;
      if (existing?.status === "draft") {
        Object.assign(existing, data, {
          updatedAt: new Date(
            Math.max(
              Date.parse(now),
              Date.parse(existing.updatedAt || existing.createdAt) + 1,
            ),
          ).toISOString(),
          updatedBy: actor.email,
        });
        break;
      }
      s.workflows.unshift({
        ...data,
        id: id(),
        version:
          Math.max(
            0,
            ...s.workflows
              .filter((w) => w.channel === c.channel)
              .map((w) => w.version),
          ) + 1,
        status: "draft",
        createdBy: actor.email,
        createdAt: now,
        updatedAt: now,
        updatedBy: actor.email,
      });
      break;
    }
    case "workflow.submit": {
      const w = s.workflows.find((x) => x.id === c.id);
      if (!w) bad("Workflow not found.");
      need("workflow.edit", { channel: w.channel });
      if (w.status !== "draft") bad("Submit a draft workflow.");
      w.status = "review";
      break;
    }
    case "workflow.activate": {
      const w = s.workflows.find((x) => x.id === c.id);
      if (!w) bad("Workflow not found.");
      need("workflow.activate", { channel: w.channel });
      if (w.status !== "review")
        bad("Submit this workflow for review before activating.");
      for (const x of s.workflows)
        if (x.channel === w.channel && x.status === "active")
          x.status = "review";
      w.status = "active";
      w.activationId = id();
      break;
    }
    case "reference.create":
      need(
        "reference.edit",
        c.channel === "Shared" ? {} : { channel: c.channel },
      );
      s.references.unshift({
        id: id(),
        title: c.title,
        content: c.content,
        channel: c.channel,
        kind: c.kind,
        createdAt: now,
      });
      break;
    case "template.save":
      need("template.edit", { channel: c.channel });
      s.templates.push({
        id: id(),
        title: c.title,
        channel: c.channel,
        slides: c.slides,
        status: "pending",
        createdBy: actor.email,
      });
      break;
    case "template.approve": {
      const t = s.templates.find((x) => x.id === c.id);
      if (!t) bad("Template not found.");
      need("policy.manage");
      t.status = "approved";
      break;
    }
    case "member.save": {
      need("users.manage");
      let m = s.members.find((x) => x.email === c.email);
      if (
        m &&
        m.email === actor.email &&
        m.roles.includes("administrator") &&
        !c.roles.includes("administrator") &&
        !s.members.some(
          (x) =>
            x.email !== actor.email &&
            x.roles.includes("administrator") &&
            !x.revoked,
        )
      )
        bad("Keep at least one active administrator.");
      if (!m) {
        m = {
          id: id(),
          email: c.email,
          roles: c.roles,
          grants: c.grants,
          revoked: false,
        };
        s.members.push(m);
      } else
        Object.assign(m, { roles: c.roles, grants: c.grants, revoked: false });
      break;
    }
    case "member.revoke":
      need("users.manage");
      if (c.email === actor.email)
        bad("You cannot revoke your own membership.");
      {
        const m = s.members.find((x) => x.email === c.email);
        if (!m) bad("Member not found.");
        m.revoked = true;
        break;
      }
    case "settings.save": {
      need("settings.manage");
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: c.timezone }).format();
      } catch {
        bad("Choose a valid IANA timezone.");
      }
      if (c.docsMode && c.docsMode !== s.settings.docsMode)
        need("policy.manage");
      const { type: _, ...data } = c;
      Object.assign(s.settings, data);
      break;
    }
    case "policy.adoptSolo": {
      need("policy.manage");
      if (c.expectedRuleVersion !== s.settings.protectedVersion)
        throw new StudioError(
          409,
          "Protected policy changed; review it before adopting two-step review.",
        );
      if (!c.packageCap || !c.monthlyCap)
        bad(
          "Choose positive package and monthly caps before enabling automation.",
        );
      s.settings.reviewPolicy = {
        mode: "two_step",
        version: id(),
        adoptedBy: actor.email,
        adoptedAt: now,
        packageCap: c.packageCap,
        requireIndependentReview: c.requireIndependentReview,
        autoDraft: c.autoDraft,
        autoReview: c.autoReview,
      };
      s.settings.monthlyCap = c.monthlyCap;
      if (!s.settings.requestCap) s.settings.requestCap = c.packageCap;
      break;
    }
    case "preparation.authorize": {
      const d = content(c.contentId, "package.approve");
      const policy = soloPolicy(s);
      if (!policy || !c.maxCents || c.maxCents > policy.packageCap)
        bad("Choose an allowance within the founder-approved package cap.");
      if (d.deletedAt || d.revision !== c.expectedRevision)
        throw new StudioError(
          409,
          "Draft changed; reload before authorizing preparation.",
        );
      const current = preparationFor(s, d, d.assignedTo, now);
      if (current) {
        if (preparationSpend(s, current.id) > c.maxCents)
          bad("The cap cannot be reduced below existing spend/reservations.");
        current.maxCents = c.maxCents;
      } else {
        const authorization = {
          id: id(),
          contentId: d.id,
          channel: d.channel,
          account: d.account,
          authorizedFor: d.assignedTo,
          authorizedBy: actor.email,
          at: now,
          period: budgetMonth(now, s.settings.timezone),
          maxCents: c.maxCents,
          functions: [
            "text",
            "research",
            "review",
            "image",
            "audio",
            "video",
          ] as import("./types").FunctionKind[],
          policyVersion: policy.version,
        };
        s.preparations ??= [];
        s.preparations.push(authorization);
        d.preparationId = authorization.id;
      }
      break;
    }
    case "content.acceptCopy": {
      const d = content(c.contentId, "package.approve"),
        policy = soloPolicy(s);
      if (
        !policy ||
        policy.version !== c.expectedPolicyVersion ||
        currentWorkflow(d, s)?.id !== c.expectedWorkflowId ||
        c.expectedRuleVersion !== s.settings.protectedVersion ||
        d.revision !== c.expectedRevision ||
        d.deletedAt
      )
        throw new StudioError(
          409,
          "Copy or policy changed. Review the current version before accepting it.",
        );
      const blockers = copyBlockers(d);
      if (blockers.length) bad(blockers.join(" "));
      const identity = copyIdentity(d, s);
      if (!currentCopyAcceptance(d, s)) {
        d.copyAcceptances ??= [];
        d.copyAcceptances.push({
          id: id(),
          actor: actor.email,
          at: now,
          identity,
          evidence: c.evidence,
          policyVersion: policy.version,
        });
      }
      d.state = "review";
      break;
    }
    case "job.applyDraft": {
      const job = jobFor(c.jobId);
      if (job.kind !== "text" || job.state !== "succeeded" || !job.candidate)
        bad("Select a complete saved writing candidate.");
      const d = content(job.contentId || "");
      if (job.createdBy !== actor.email && !can(s, actor, "users.manage"))
        bad("This candidate belongs to another creator.");
      if (job.appliedAt) return structuredClone(input);
      if (d.deletedAt || d.revision !== c.expectedRevision)
        throw new StudioError(
          409,
          "Draft changed. Compare again before applying this candidate.",
        );
      if (job.candidate.questions.length && !c.questionsResolution)
        bad(
          "Record how the candidate's missing facts were resolved before applying it.",
        );
      if (job.candidate.questions.length) {
        job.questionsDisposition = {
          by: actor.email,
          at: now,
          evidence: c.questionsResolution!,
        };
      }
      applyDraftCandidate(d, job, actor.email, now, id);
      break;
    }
    case "connection.default": {
      const connection = s.connections.find((x) => x.id === c.id);
      if (!connection) bad("Connection unavailable.");
      need("connections.manage", { function: connection.function });
      if (connection.status === "disconnected")
        bad("Choose a connected credential.");
      s.settings.defaultConnections = {
        ...s.settings.defaultConnections,
        [connection.function]: connection.id,
      };
      break;
    }
    case "policy.save":
      need("policy.manage");
      s.settings.protectedRules = c.rules;
      s.settings.protectedVersion = id();
      break;
    case "exception.record": {
      need("policy.manage");
      const d = content(c.contentId);
      if (d.revision !== c.expectedRevision)
        throw new StudioError(
          409,
          "Content changed; review the exact wording first.",
        );
      if (
        !contentWording(d)
          .split("\n")
          .some((line) => line.trim() === c.wording.trim())
      )
        bad("Quote an exact line from this content revision.");
      s.exceptions ??= [];
      s.exceptions.push({
        id: id(),
        contentId: d.id,
        revision: d.revision,
        wording: c.wording.trim(),
        reason: c.reason,
        by: actor.email,
        at: now,
        ruleVersion: s.settings.protectedVersion,
      });
      break;
    }
    case "notice.read": {
      const n = s.notices.find((x) => x.id === c.id && x.user === actor.email);
      if (!n) bad("Notification not found.");
      n.read = true;
      break;
    }
    case "recurrence.save":
      need("settings.manage");
      s.recurrences.push({
        id: id(),
        title: c.title,
        channel: c.channel,
        quantity: c.quantity,
        nextAt: c.nextAt,
        research: c.research,
        state: "active",
      });
      break;
    case "recurrence.pause": {
      need("settings.manage");
      const r = s.recurrences.find((x) => x.id === c.id);
      if (!r) bad("Schedule not found.");
      r.state = r.state === "active" ? "paused" : "active";
      break;
    }
    case "recurrence.research": {
      need("settings.manage");
      const r = s.recurrences.find((x) => x.id === c.id);
      if (!r) bad("Recurring schedule not found.");
      if (r.nextAt !== c.occurrence || r.lastOccurrence === c.occurrence)
        throw new StudioError(
          409,
          "This occurrence has already been handled. A late answer will not start another paid run.",
        );
      r.researchChoice = { occurrence: c.occurrence, allowed: c.allowed };
      break;
    }
    case "job.enqueue": {
      const d = c.contentId
        ? s.contents.find((x) => x.id === c.contentId)
        : undefined;
      if (c.contentId && !d) bad("Content not found.");
      need("job.create", {
        channel: c.channel,
        function: c.kind,
        contentId: c.contentId,
        account: d?.account,
        assignedTo: d?.assignedTo,
      });
      if (d && d.channel !== c.channel)
        bad("The selected channel does not match this content.");
      const connection = s.connections.find(
        (x) => x.id === c.connectionId && x.function === c.kind,
      );
      if (!connection)
        bad("Configure an AI connection for this function first.");
      if (
        connection.status === "disconnected" ||
        (!ctx.demo && (!connection.hasKey || connection.status !== "validated"))
      )
        bad("Validate a connected provider credential before generation.");
      const workflow = s.workflows.find(
        (w) => w.channel === c.channel && w.status === "active",
      );
      if (!workflow) bad("Activate a channel workflow first.");
      const boundConnection =
        resolvedConnection(s, c.channel, c.kind) ||
        (ctx.demo
          ? s.connections.find((x) => x.function === c.kind)?.id
          : undefined);
      if (boundConnection !== c.connectionId)
        bad(
          "This connection is not the active workflow binding for this function. A permitted administrator must activate the desired mapping.",
        );
      const outputContract =
        ctx.canonicalGeneration && d
          ? c.kind === "text"
            ? "draft_v1"
            : c.kind === "review"
              ? "review_v1"
              : undefined
          : undefined;
      const payloadHash = fingerprint({
        outputContract,
        kind: c.kind,
        channel: c.channel,
        contentId: c.contentId,
        prompt: c.prompt,
        connectionId: c.connectionId,
      });
      const existing = s.jobs.find(
        (x) =>
          x.idempotencyKey === c.idempotencyKey && x.createdBy === actor.email,
      );
      if (existing) {
        if (existing.payloadHash !== payloadHash)
          bad("This request key was already used for different inputs.");
        return structuredClone(input);
      }
      const allowance = (
        connection as typeof connection & { maxRequestCost?: number }
      ).maxRequestCost;
      if (!allowance && !ctx.demo)
        bad(
          "This connection needs a validated conservative request allowance before paid generation.",
        );
      const estimate = ctx.demo ? allowance || c.estimate : ctx.quotedCost || 0;
      if (!estimate) bad("A positive request allowance is required.");
      const preparation = preparationFor(s, d, actor.email, now);
      if (
        d &&
        soloPolicy(s) &&
        (!preparation || !preparation.functions.includes(c.kind))
      )
        bad(
          "This content needs a current package budget authorization for this actor and function. A single-job confirmation cannot bypass its total cap.",
        );
      const preauthorized = Boolean(
        ctx.canonicalGeneration && preparation?.functions.includes(c.kind),
      );
      const j: Job = {
        id: id(),
        kind: c.kind,
        channel: c.channel,
        contentId: c.contentId,
        prompt: c.prompt,
        connectionId: c.connectionId,
        estimate,
        reserved: 0,
        state:
          estimate > s.settings.confirmationThreshold &&
          !c.confirmed &&
          !preauthorized
            ? "awaiting_confirmation"
            : "queued",
        attempt: 0,
        idempotencyKey: c.idempotencyKey,
        createdBy: actor.email,
        createdAt: now,
        account: d?.account,
        workflowId: workflow.id,
        workflowSnapshot: structuredClone(workflow),
        rulesSnapshot: s.settings.protectedRules,
        period: budgetMonth(now, s.settings.timezone),
        payloadHash,
        mediaRevision: d?.mediaRevision || 1,
        preparationId: preparation?.id,
        targetRevision: d?.revision,
        targetIdentity: d ? copyIdentity(d, s) : undefined,
        targetAccepted: d ? Boolean(currentCopyAcceptance(d, s)) : false,
        outputContract,
        connectionSnapshot: {
          provider: connection.provider,
          model: connection.model,
          function: connection.function,
        },
        ...{
          createdById: actor.id,
          project: d?.collection || "Unassigned",
          pricingSnapshot: ctx.pricingSnapshot,
          referenceSnapshots: s.references
            .filter((r) => workflow.references.includes(r.id))
            .map((r) => structuredClone(r)),
        },
      };
      if (j.state === "queued") reserve(j);
      s.jobs.unshift(j);
      break;
    }
    case "job.confirm": {
      const j = jobFor(c.id);
      if (j.state !== "awaiting_confirmation")
        bad("Only a waiting job can be confirmed.");
      reserve(j);
      break;
    }
    case "job.reconcile": {
      need("settings.manage");
      const j = s.jobs.find((x) => x.id === c.id);
      if (!j) bad("Job not found.");
      if (!["unknown", "succeeded", "failed"].includes(j.state))
        bad("Only a completed or unknown outcome can be reconciled.");
      j.actual = c.actual;
      j.reserved = 0;
      j.state = c.outcome;
      j.error = "Human billing/outcome reconciliation: " + c.reason;
      break;
    }
    case "job.cancel": {
      const j = jobFor(c.id);
      if (!["queued", "awaiting_confirmation", "blocked"].includes(j.state))
        bad(
          "Dispatched or unknown jobs cannot be blindly cancelled or retried.",
        );
      j.state = "cancelled";
      j.reserved = 0;
      break;
    }
    case "docs.link": {
      const d = content(c.contentId);
      if (
        s.contents.some(
          (other) =>
            other.id !== d.id && other.docId === c.docId && !other.deletedAt,
        )
      )
        bad("Use a separate Google Doc for each platform draft.");
      if (d.docsIncoming)
        d.history.push({
          id: id(),
          text: d.docsIncoming.text,
          title: d.title,
          metadata: structuredClone(d.metadata),
          media: structuredClone(d.media),
          createdBy: actor.email,
          createdAt: d.docsIncoming.fetchedAt,
          reason: "Google incoming branch retained before document relink",
        });
      d.docId = c.docId;
      d.docsOwnerId = actor.id;
      d.docsOwnerEmail = actor.email;
      d.docsFetchedAt = undefined;
      d.docsLastCheckedAt = undefined;
      d.docsIncoming = undefined;
      d.docsSyncError = undefined;
      d.docsBase = d.text;
      break;
    }
    case "docs.import": {
      const d = content(c.contentId);
      if (d.revision !== c.expectedRevision)
        throw new StudioError(
          409,
          "The draft changed while fetching. Refresh before importing.",
        );
      if (
        c.expectedIncomingFetchedAt &&
        d.docsIncoming?.fetchedAt !== c.expectedIncomingFetchedAt
      )
        throw new StudioError(
          409,
          "Incoming Google Docs version changed. Compare again before importing.",
        );
      if (d.docsIncoming && d.docsIncoming.text !== c.text)
        d.history.push({
          id: id(),
          text: d.docsIncoming.text,
          title: d.title,
          metadata: d.metadata,
          media: structuredClone(d.media),
          createdBy: actor.email,
          createdAt: d.docsIncoming.fetchedAt,
          reason: "Google incoming branch preserved before manual import",
        });
      remember(
        d,
        "Google Docs / DOCX import; displaced Studio version retained",
      );
      d.factsRevision = (d.factsRevision ?? d.textRevision ?? 1) + 1;
      d.text = c.text;
      d.textRevision = (d.textRevision || 1) + 1;
      d.docsBase = c.text;
      d.docsFetchedAt = now;
      d.docsLastCheckedAt = now;
      d.docsIncoming = undefined;
      d.docsSyncError = undefined;
      break;
    }
  }
  s.version = input.version + 1;
  s.audit.push({
    id: id(),
    actor: actor.email,
    action: c.type,
    target:
      "id" in c
        ? String(c.id)
        : "contentId" in c
          ? String(c.contentId)
          : "workspace",
    at: now,
  });
  return s;
}
