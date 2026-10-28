import type { Actor, Content, Job, StudioState } from "./types";
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
import { sampleIdeas } from "./idea-generation";
import { demoPreset, type ChannelPreset } from "./presets";
import { ideaJobInput } from "./idea-generation";
import { review } from "../brand";
export type ExecutionContext = {
  now?: string;
  id?: () => string;
  demo?: boolean;
  hash?: (value: string) => string;
  quotedCost?: number;
  pricingSnapshot?: unknown;
  assetManifest?: unknown[];
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
          "Current web research requires a qualified research adapter. No research or generation was started. Uncheck research to use supplied references only.",
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
      const oldFacts = factsSignature(d),
        oldFactsRevision = d.factsRevision ?? d.textRevision ?? 1,
        oldTitle = d.title;
      const mediaChanged =
          JSON.stringify(d.media) !== JSON.stringify(c.media) ||
          (c.format !== undefined && c.format !== d.format),
        textChanged =
          d.text !== c.text || d.title !== c.title || d.metadata !== c.metadata;
      remember(d, "Studio edit");
      Object.assign(d, {
        title: c.title,
        text: c.text,
        metadata: c.metadata,
        media: c.media,
        format: c.format || d.format,
        collection: c.collection ?? d.collection,
        textRevision: (d.textRevision || 1) + (textChanged ? 1 : 0),
        mediaRevision: (d.mediaRevision || 1) + (mediaChanged ? 1 : 0),
      });
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
      const all =
        d.title +
        "\n" +
        d.text +
        "\n" +
        d.metadata +
        "\n" +
        d.media.narration +
        "\n" +
        d.media.captions +
        "\n" +
        d.media.slides.map((x) => x.title + " " + x.body).join("\n") +
        "\n" +
        d.media.scenes.map((x) => x.script).join("\n");
      const check = review(all, "general");
      if (
        check.issues.some((x) => x.severity === "BLOCK") ||
        /\[(?:Ryan|source|confirm|verify)[^\]]*\]/i.test(all) ||
        /\bNEEDS_SOURCE\b/.test(all)
      )
        bad(
          "Resolve blocking factual claims and confirmation placeholders before approval.",
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
      if (!stageSummary(d, s).readyForApproval)
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
      const { type: _, id: _id, ...data } = c;
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
      const { type: _, ...data } = c;
      Object.assign(s.settings, data);
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
        !(d.text + "\n" + d.metadata + "\n" + d.title)
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
      const workflow = s.workflows.find(
        (w) => w.channel === c.channel && w.status === "active",
      );
      if (!workflow) bad("Activate a channel workflow first.");
      const boundConnection =
        workflow.functionConnections?.[c.kind] ||
        (c.kind === "text" ? workflow.connectionId : "") ||
        s.connections.find((x) => x.function === c.kind)?.id;
      if (boundConnection !== c.connectionId)
        bad(
          "This connection is not the active workflow binding for this function. A permitted administrator must activate the desired mapping.",
        );
      const payloadHash = fingerprint({
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
          estimate > s.settings.confirmationThreshold && !c.confirmed
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
      d.docId = c.docId;
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
      remember(
        d,
        "Google Docs / DOCX import; displaced Studio version retained",
      );
      d.factsRevision = (d.factsRevision ?? d.textRevision ?? 1) + 1;
      d.text = c.text;
      d.textRevision = (d.textRevision || 1) + 1;
      d.docsBase = c.text;
      d.docsFetchedAt = now;
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
