import type { Content, StudioState } from "./types";
import { copyIdentity, currentCopyAcceptance } from "./solo-quality";
import { MAX_CORRECTION_ROUNDS } from "./review-correction";
import { preparationFor, preparationSpend } from "./preparation-budget";
import { generationInput } from "./generation";
import { quote } from "./pricing";
import { applyCommand } from "./engine";
import { StudioError } from "./permissions";
/** Creates at most one bounded correction job per pass. Never calls a provider or retries a failed/uncertain request. */
export function orchestrateCorrections(
  input: StudioState,
  now = new Date().toISOString(),
) {
  if (
    !input.settings.reviewPolicy?.autoReview ||
    !input.settings.reviewPolicy.autoCorrect
  )
    return input;
  let state = input,
    changed = false,
    queued = false;
  const record = (
    contentId: string,
    cycle: NonNullable<Content["reviewCycle"]>,
  ) => {
    const old = state.contents.find((c) => c.id === contentId)!.reviewCycle;
    if (
      JSON.stringify({ ...old, at: undefined }) ===
      JSON.stringify({ ...cycle, at: undefined })
    )
      return;
    if (state === input) state = structuredClone(state);
    state.contents.find((c) => c.id === contentId)!.reviewCycle = cycle;
    changed = true;
  };
  for (const original of input.contents) {
    if (
      original.deletedAt ||
      original.state !== "review" ||
      !original.reviewSubmission ||
      currentCopyAcceptance(original, state)
    )
      continue;
    const identity = copyIdentity(original, state),
      report = original.agentReview;
    if (
      original.reviewSubmission.identity !== identity ||
      report?.identity !== identity
    )
      continue;
    if (
      state.packages.some(
        (p) => p.contentId === original.id && p.revision === original.revision,
      )
    )
      continue;
    const root =
      original.reviewSubmission.rootId || original.reviewSubmission.id;
    const previous =
      original.reviewCycle?.rootSubmissionId === root
        ? original.reviewCycle
        : undefined;
    const base = {
      rootSubmissionId: root,
      rounds: previous?.rounds || 0,
      at: now,
    };
    if (!report.issues.length) {
      record(original.id, { ...base, status: "ready" });
      continue;
    }
    const key = `auto-correct:${root}:${report.jobId}`;
    const existing = state.jobs.find(
      (j) => j.contentId === original.id && j.idempotencyKey === key,
    );
    if (existing) {
      record(original.id, {
        ...base,
        jobId: existing.id,
        status: ["queued", "running", "awaiting_confirmation"].includes(
          existing.state,
        )
          ? "correcting"
          : existing.candidate?.questions.length
            ? "needs_input"
            : "stopped",
        reason: existing.candidate?.questions.length
          ? existing.candidate.questions.join("\n")
          : existing.error ||
            "Existing correction is retained; no automatic retry.",
      });
      continue;
    }
    if (base.rounds >= MAX_CORRECTION_ROUNDS) {
      record(original.id, {
        ...base,
        status: "needs_input",
        reason:
          "Two correction rounds are complete. Review the remaining findings; no further automatic paid request will be made.",
      });
      continue;
    }
    if (queued) continue;
    try {
      const member = state.members.find(
        (m) => m.email === original.reviewSubmission!.actor && !m.revoked,
      );
      if (!member)
        throw new StudioError(
          403,
          "The submitting writer no longer has workspace access.",
        );
      const actor = { id: member.id, email: member.email };
      const preparation = preparationFor(state, original, actor.email, now);
      if (
        !preparation?.functions.includes("text") ||
        !preparation.functions.includes("review")
      )
        throw new StudioError(
          409,
          "Automatic corrections need Writing and Review within a current package allowance. No correction was sent.",
        );
      const command = generationInput(state, actor, {
        contentId: original.id,
        expectedRevision: original.revision,
        kind: "text",
        idempotencyKey: key,
        notes: JSON.stringify({
          task: "Correct the exact reviewed draft using supplied evidence. Preserve its purpose, structure and accurate passages. Remove or qualify unsupported claims; never invent facts, sources or personal experiences. Return the full draft contract. Ask only for genuinely missing facts that cannot be resolved from supplied evidence. Do not claim visual inspection or publish.",
          findings: report.issues,
          summary: report.summary,
        }),
      });
      const priced = quote(state, command);
      const reviewQuote = quote(
        state,
        generationInput(state, actor, {
          contentId: original.id,
          expectedRevision: original.revision,
          kind: "review",
          idempotencyKey: `recheck-budget:${key}`,
        }),
      );
      if (
        preparationSpend(state, preparation.id) +
          priced.cost +
          reviewQuote.cost >
        preparation.maxCents
      )
        throw new StudioError(
          409,
          "The remaining package allowance cannot cover a correction and recheck. No correction was sent; founder review or an explicit budget update is available.",
        );
      const round = base.rounds + 1;
      state = applyCommand(state, actor, command, {
        now,
        canonicalGeneration: true,
        quotedCost: priced.cost,
        pricingSnapshot: priced.pricingSnapshot,
        reviewCorrection: {
          reviewJobId: report.jobId,
          rootSubmissionId: root,
          round,
        },
      });
      const job = state.jobs.find(
        (j) => j.idempotencyKey === key && j.createdBy === actor.email,
      )!;
      record(original.id, {
        ...base,
        rounds: round,
        jobId: job.id,
        status: "correcting",
      });
      queued = true;
    } catch (e) {
      record(original.id, {
        ...base,
        status: "stopped",
        reason:
          e instanceof Error
            ? e.message
            : "Automatic correction setup could not be verified.",
      });
    }
  }
  if (state === input) return input;
  if (changed && state.version === input.version) state.version++;
  if (changed)
    state.audit.push({
      id: crypto.randomUUID(),
      actor: "studio-correction-orchestration",
      action: "review.correction_checked",
      target: "workspace",
      at: now,
    });
  return state;
}
