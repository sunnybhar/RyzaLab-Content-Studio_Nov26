import type { Actor, Channel, StudioState } from "./types";
import { requirePermission, StudioError } from "./permissions";
import { applyCommand } from "./engine";
import { ideaJobInput } from "./idea-generation";
import { generationInput } from "./generation";
import { effectiveRates, quote } from "./pricing";
import { resolvedConnection, copyIdentity, copyBlockers } from "./solo-quality";
import { publicResearchSchema } from "./research";
import { budgetMonth } from "./time";
export interface VerificationCase {
  id: string;
  name: string;
  channel: Channel;
  mode: "ai" | "manual";
  contentId?: string;
  ideaJobId?: string;
  writingJobId?: string;
  researchJobId?: string;
  identity?: string;
  phase:
    "pending" | "ideas" | "writing" | "ready" | "manual_input" | "attention";
  error?: string;
}
export interface VerificationRun {
  id: string;
  createdBy: string;
  createdAt: string;
  idempotencyKey: string;
  cases: VerificationCase[];
  maxPreparationCents: number;
}
export const VERIFICATION_QUERY =
  "home automation usability household documentation and handoff checklist";
const topics = [
  "A practical household technology handoff checklist",
  "Why simple controls need clear operating instructions",
  "Newsletter: expand the LinkedIn handoff checklist",
];
const caseDefinitions: Pick<VerificationCase, "name" | "channel" | "mode">[] = [
  {
    name: "1 · AI LinkedIn: researched checklist",
    channel: "LinkedIn",
    mode: "ai",
  },
];
function unitCeiling(
  state: StudioState,
  channel: Channel,
  kind: "text" | "ideas" | "review",
) {
  const connection = state.connections.find(
    (c) => c.id === resolvedConnection(state, channel, kind),
  );
  const card = effectiveRates(state).find(
    (r) =>
      r.model === connection?.model &&
      r.provider === connection?.provider &&
      r.function === kind,
  );
  if (
    !connection ||
    connection.provider !== "anthropic" ||
    !connection.hasKey ||
    connection.status !== "validated" ||
    (connection.function !== kind &&
      !connection.supportedFunctions?.includes(kind)) ||
    !card ||
    card.fixedCents ||
    card.maxInputBytes > 65536 ||
    card.maxOutputTokens > 2048
  )
    throw new StudioError(
      409,
      `Enable bounded ${kind} for ${channel}; remove or qualify conflicting channel overrides first.`,
    );
  const cents = Math.ceil(
    (card.maxInputBytes * card.inputCentsPerMillion +
      card.maxOutputTokens * card.outputCentsPerMillion) /
      1000000,
  );
  const allowance = (
    connection as typeof connection & { maxRequestCost?: number }
  ).maxRequestCost;
  if (!allowance || allowance < cents)
    throw new StudioError(
      409,
      `The ${kind} connection needs a request allowance of at least $${(cents / 100).toFixed(2)}.`,
    );
  return cents;
}
export function verificationPreflight(
  state: StudioState,
  actor: Actor,
  now = new Date().toISOString(),
) {
  requirePermission(state, actor, "settings.manage");
  for (const channel of ["LinkedIn", "Newsletter", "Reddit"] as const)
    for (const action of [
      "read",
      "content.create",
      "content.edit",
      "idea.edit",
      "package.approve",
    ])
      requirePermission(state, actor, action, { channel });
  for (const channel of ["LinkedIn", "Newsletter"] as const)
    for (const fn of ["research", "ideas", "text", "review"] as const)
      requirePermission(state, actor, "job.create", { channel, function: fn });
  if (state.settings.reviewPolicy?.mode !== "two_step")
    throw new StudioError(409, "Enable the two-step review policy first.");
  let preparationCents = 0,
    reviewCents = 0;
  for (const channel of caseDefinitions
    .filter((c) => c.mode === "ai")
    .map((c) => c.channel)) {
    if (
      !state.workflows.some(
        (w) => w.channel === channel && w.status === "active",
      )
    )
      throw new StudioError(409, `Activate the ${channel} workflow first.`);
    const ideas = unitCeiling(state, channel, "ideas"),
      text = unitCeiling(state, channel, "text"),
      review = unitCeiling(state, channel, "review");
    if (
      ideas + text + review >
      Math.min(state.settings.reviewPolicy.packageCap, 200)
    )
      throw new StudioError(
        409,
        "The full sample preparation and later review exceed the founder package cap.",
      );
    if (state.settings.requestCap < Math.max(ideas, text, review))
      throw new StudioError(
        409,
        "A sample exceeds the existing per-request cap.",
      );
    preparationCents += ideas + text;
    reviewCents += review;
  }
  const period = budgetMonth(now, state.settings.timezone),
    used = state.jobs
      .filter((j) => j.period === period)
      .reduce((n, j) => n + (j.actual ?? j.reserved), 0);
  if (
    !state.settings.monthlyCap ||
    used + preparationCents + reviewCents > state.settings.monthlyCap
  )
    throw new StudioError(
      409,
      "Insufficient monthly headroom for sample preparation plus the three later copy reviews. The founder monthly budget was preserved.",
    );
  return { preparationCents, reviewCents };
}
export function startVerificationPack(
  input: StudioState,
  actor: Actor,
  key: string,
  result: unknown,
  now = new Date().toISOString(),
) {
  const existing = input.verificationRuns?.find(
    (r) => r.createdBy === actor.email && r.idempotencyKey === key,
  );
  if (existing) return input;
  if (
    input.verificationRuns?.some(
      (r) =>
        r.createdBy === actor.email &&
        r.cases.some((c) => ["pending", "ideas", "writing"].includes(c.phase)),
    )
  )
    throw new StudioError(
      409,
      "A sample pack is already preparing. Inspect it before starting another.",
    );
  const limits = verificationPreflight(input, actor, now),
    evidence = publicResearchSchema.parse(result);
  let state = input;
  const sourceIds: Partial<Record<Channel, string>> = {};
  for (const channel of ["LinkedIn", "Newsletter"] as const) {
    state = applyCommand(
      state,
      actor,
      {
        type: "research.retrieve",
        channel,
        query: VERIFICATION_QUERY,
        idempotencyKey: `${key}:refs:${channel}`,
      },
      { retrievalResult: evidence, now },
    );
    sourceIds[channel] = state.jobs[0].id;
  }
  const run: VerificationRun = {
    id: crypto.randomUUID(),
    createdBy: actor.email,
    createdAt: now,
    idempotencyKey: key,
    maxPreparationCents: limits.preparationCents,
    cases: caseDefinitions.map((c, i) => ({
      ...c,
      id: String(i + 1),
      phase: c.mode === "ai" ? "pending" : "manual_input",
      researchJobId: c.mode === "ai" ? sourceIds[c.channel] : undefined,
    })),
  };
  state.verificationRuns ??= [];
  state.verificationRuns.unshift(run);
  state.version++;
  state.audit.push({
    id: crypto.randomUUID(),
    actor: actor.email,
    action: "verification.start",
    target: run.id,
    at: now,
  });
  return advanceVerificationPacks(state, now);
}
/** One paid job is enqueued per pass, only from the explicit pack authorization.
 * Failure/uncertainty stops that case. Never retries a provider request or approves copy. */
export function advanceVerificationPacks(
  input: StudioState,
  now = new Date().toISOString(),
) {
  let state = structuredClone(input),
    changed = false;
  for (const run of state.verificationRuns || []) {
    const member = state.members.find(
      (m) => m.email === run.createdBy && !m.revoked,
    );
    if (!member) continue;
    const actor = { id: member.id, email: member.email };
    for (let index = 0; index < run.cases.length; index++) {
      const item = run.cases[index];
      if (item.phase === "attention") break;
      if (item.phase === "ready") continue;
      if (item.mode === "manual") {
        if (item.contentId) continue;
        try {
          if (index === 3) {
            state = applyCommand(
              state,
              actor,
              {
                type: "idea.create",
                channel: "LinkedIn",
                title: "Manual sample: make a handoff useful",
                brief:
                  "Write your own post explaining what should go in a household technology handoff. Use real details only; no AI writing will run for this sample.",
              },
              { now },
            );
            const idea = state.ideas[0];
            state = applyCommand(
              state,
              actor,
              {
                type: "content.create",
                channel: "LinkedIn",
                title: idea.title,
                format: "Text post",
              },
              { now },
            );
            state.contents[0].ideaId = idea.id;
          } else {
            state = applyCommand(
              state,
              actor,
              {
                type: "content.create",
                channel: "Reddit",
                title: "Reddit source template for manual adaptation",
                format: "Text post",
              },
              { now },
            );
            let source = state.contents[0];
            state = applyCommand(
              state,
              actor,
              {
                type: "content.save",
                id: source.id,
                expectedRevision: source.revision,
                title: source.title,
                text: "A household technology handoff could explain the everyday controls, the fallback when automation stops, and where to find operating instructions. What would you include?",
                metadata: "",
                media: source.media,
                collection: "Verification source template",
              },
              { now },
            );
            source = state.contents.find((c) => c.id === source.id)!;
            state = applyCommand(
              state,
              actor,
              {
                type: "content.newsletter",
                sourceKind: "content",
                sourceId: source.id,
                expectedRevision: source.revision,
              },
              { now },
            );
          }
          item.contentId = state.contents[0].id;
          changed = true;
        } catch (e) {
          item.phase = "attention";
          item.error =
            e instanceof Error ? e.message : "Manual draft setup failed.";
          changed = true;
        }
        continue;
      }
      try {
        const previous = run.cases[index - 1];
        if (index > 0 && previous?.mode === "ai" && previous.phase !== "ready")
          break;
        if (!item.contentId) {
          if (index === 2) {
            const source = state.contents.find(
              (c) => c.id === run.cases[0].contentId && !c.deletedAt,
            );
            if (!source?.text)
              throw new StudioError(
                409,
                "The first LinkedIn source draft is unavailable.",
              );
            state = applyCommand(
              state,
              actor,
              {
                type: "content.newsletter",
                sourceKind: "content",
                sourceId: source.id,
                expectedRevision: source.revision,
              },
              { now },
            );
          } else
            state = applyCommand(
              state,
              actor,
              {
                type: "content.create",
                channel: item.channel,
                title: topics[index],
                format: "Text post",
              },
              { now },
            );
          const d = state.contents[0];
          d.researchJobIds = [item.researchJobId!];
          item.contentId = d.id;
          item.identity = copyIdentity(d, state);
          changed = true;
        }
        let d = state.contents.find(
          (c) => c.id === item.contentId && !c.deletedAt,
        );
        if (!d) throw new StudioError(409, "Sample draft is unavailable.");
        if (
          item.phase !== "writing" &&
          item.identity !== copyIdentity(d, state)
        )
          throw new StudioError(
            409,
            "Sample draft or context changed. Edits were preserved; automatic preparation stopped.",
          );
        if (!item.ideaJobId) {
          state = applyCommand(
            state,
            actor,
            {
              type: "preparation.authorize",
              contentId: d.id,
              expectedRevision: d.revision,
              maxCents: Math.min(state.settings.reviewPolicy!.packageCap, 200),
            },
            { now },
          );
          const command = {
            ...ideaJobInput(state, actor, {
              channel: item.channel,
              topic: topics[index],
              audience: "Households managing everyday technology",
              quantity: 1,
              research: true,
              researchJobIds: [item.researchJobId!],
              sourceText: d.newsletterSource?.text || "",
              idempotencyKey: `${run.id}:${item.id}:ideas`,
            }),
            contentId: d.id,
          };
          const priced = quote(state, command);
          const packJobIds = run.cases
            .flatMap((c) => [c.ideaJobId, c.writingJobId])
            .filter(Boolean);
          const committed = state.jobs
            .filter((j) => packJobIds.includes(j.id))
            .reduce((n, j) => n + (j.actual ?? j.reserved), 0);
          if (committed + priced.cost > run.maxPreparationCents)
            throw new StudioError(
              409,
              "The sample-pack preparation ceiling is exhausted. No additional paid request was made.",
            );
          state = applyCommand(state, actor, command, {
            now,
            canonicalGeneration: true,
            quotedCost: priced.cost,
            pricingSnapshot: priced.pricingSnapshot,
          });
          item.ideaJobId = state.jobs[0].id;
          item.phase = "ideas";
          changed = true;
          break;
        }
        const ideasJob = state.jobs.find((j) => j.id === item.ideaJobId);
        if (
          !ideasJob ||
          ["failed", "unknown", "cancelled", "blocked"].includes(ideasJob.state)
        )
          throw new StudioError(
            409,
            ideasJob?.error || "Idea generation needs reconciliation.",
          );
        if (ideasJob.state !== "succeeded") break;
        if (!item.writingJobId) {
          const idea = state.ideas.find(
            (i) => i.generationRunId === ideasJob.id,
          );
          if (!idea)
            throw new StudioError(
              409,
              ideasJob.error ||
                "Idea response was not usable. Inspect the retained result.",
            );
          // Selecting the first test idea was explicitly authorized by Prepare pack; no human copy approval is recorded.
          d.ideaId = idea.id;
          d.title = idea.title;
          item.identity = copyIdentity(d, state);
          const command = generationInput(state, actor, {
            contentId: d.id,
            expectedRevision: d.revision,
            kind: "text",
            notes:
              "Create only this sample. Use supplied excerpts with source attribution. Keep LinkedIn around 150–220 words and Newsletter around 300–450 words. Do not claim personal experience; use general guidance unless the source supports a fact. Return the selected-piece JSON contract.",
            researchJobIds: [item.researchJobId!],
            idempotencyKey: `${run.id}:${item.id}:writing`,
          });
          const priced = quote(state, command);
          const packJobIds = run.cases
            .flatMap((c) => [c.ideaJobId, c.writingJobId])
            .filter(Boolean);
          const committed = state.jobs
            .filter((j) => packJobIds.includes(j.id))
            .reduce((n, j) => n + (j.actual ?? j.reserved), 0);
          if (committed + priced.cost > run.maxPreparationCents)
            throw new StudioError(
              409,
              "The sample-pack preparation ceiling is exhausted. No additional paid request was made.",
            );
          state = applyCommand(state, actor, command, {
            now,
            canonicalGeneration: true,
            quotedCost: priced.cost,
            pricingSnapshot: priced.pricingSnapshot,
          });
          item.writingJobId = state.jobs[0].id;
          item.phase = "writing";
          changed = true;
          break;
        }
        const writing = state.jobs.find((j) => j.id === item.writingJobId);
        if (
          !writing ||
          ["failed", "unknown", "cancelled", "blocked"].includes(writing.state)
        )
          throw new StudioError(
            409,
            writing?.error || "Writing needs reconciliation.",
          );
        if (writing.state !== "succeeded") break;
        if (writing.outputStatus !== "applied")
          throw new StudioError(
            409,
            writing.error ||
              "Saved AI output needs attention. No replacement or additional paid request was made.",
          );
        d = state.contents.find((c) => c.id === item.contentId)!;
        item.phase = "ready";
        item.error = copyBlockers(d).length
          ? "Draft prepared; highlighted inputs need your editing before review."
          : undefined;
        changed = true;
      } catch (e) {
        item.phase = "attention";
        item.error =
          e instanceof Error ? e.message : "Sample preparation stopped.";
        changed = true;
        break;
      }
    }
    // applyCommand clones state, so explicitly persist the updated run owned by this pass.
    const at = state.verificationRuns?.findIndex((r) => r.id === run.id) ?? -1;
    if (at >= 0) state.verificationRuns![at] = run;
  }
  if (!changed) return input;
  if (state.version === input.version) state.version++;
  return state;
}
