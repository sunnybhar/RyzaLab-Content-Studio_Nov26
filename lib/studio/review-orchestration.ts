import type { StudioState } from "./types";
import {
  currentCopyAcceptance,
  copyIdentity,
  soloPolicy,
  resolvedConnection,
} from "./solo-quality";
import { generationInput } from "./generation";
import { preparationFor } from "./preparation-budget";
import { applyCommand } from "./engine";
import { quote } from "./pricing";
import { StudioError } from "./permissions";

/** Enqueues bounded, canonical review work. It never calls or retries a provider. */
export function orchestrateReviews(
  input: StudioState,
  now = new Date().toISOString(),
) {
  const policy = soloPolicy(input);
  if (!policy?.autoReview) return input;
  let state = input;
  let changed = false;
  let queued = false;
  for (const original of input.contents) {
    if (original.deletedAt || original.state !== "review") continue;
    const acceptance = currentCopyAcceptance(original, state);
    if (!acceptance) continue;
    if (
      state.packages.some(
        (p) => p.contentId === original.id && p.revision === original.revision,
      )
    )
      continue;
    const identity = copyIdentity(original, state);
    if (original.agentReview?.identity === identity) continue;
    const key = `auto-review:${acceptance.id}`;
    const existing = state.jobs.find(
      (j) =>
        j.contentId === original.id &&
        j.outputContract === "review_v1" &&
        (j.idempotencyKey === key || j.targetIdentity === identity),
    );
    let jobId: string | undefined;
    let error: string | undefined;
    if (existing) {
      jobId = existing.id;
      if (
        !["queued", "running", "awaiting_confirmation"].includes(existing.state)
      )
        error =
          existing.state === "unknown"
            ? "The previous review outcome is uncertain. Reconcile it before requesting another review."
            : "The previous review did not attach a current report. Inspect its saved result; another paid run requires an explicit request.";
    } else if (
      state.jobs.some(
        (j) =>
          j.contentId === original.id &&
          ["queued", "running", "awaiting_confirmation", "unknown"].includes(
            j.state,
          ),
      )
    ) {
      error =
        "Resolve existing active or uncertain work before the automatic review can start.";
    } else if (queued) continue;
    else {
      try {
        const member = state.members.find(
          (m) => m.email === acceptance.actor && !m.revoked,
        );
        if (!member)
          throw new StudioError(
            403,
            "The copy approver no longer has workspace access.",
          );
        const actor = { id: member.id, email: member.email };
        if (!preparationFor(state, original, actor.email, now))
          throw new StudioError(
            409,
            "Authorize a current package allowance for the copy approver before review.",
          );
        const command = generationInput(state, actor, {
          contentId: original.id,
          expectedRevision: original.revision,
          kind: "review",
          idempotencyKey: key,
        });
        const reviewer = state.connections.find(
          (c) => c.id === resolvedConnection(state, original.channel, "review"),
        );
        if (
          (original.channel === "Notes" || policy.requireIndependentReview) &&
          (!original.generatedBy ||
            reviewer?.provider === original.generatedBy.provider)
        )
          throw new StudioError(
            409,
            "An independent review needs known copy provenance and a qualified reviewer from a different provider. No review request was sent.",
          );
        const priced = quote(state, command);
        state = applyCommand(state, actor, command, {
          now,
          canonicalGeneration: true,
          quotedCost: priced.cost,
          pricingSnapshot: priced.pricingSnapshot,
        });
        jobId = state.jobs.find(
          (j) => j.idempotencyKey === key && j.createdBy === actor.email,
        )?.id;
        queued = true;
      } catch (cause) {
        error =
          cause instanceof StudioError
            ? cause.message
            : "Review setup could not be verified. Check the review connection, pricing and package allowance.";
      }
    }
    const current = state.contents.find((c) => c.id === original.id)!;
    if (
      current.automaticReview?.acceptanceId === acceptance.id &&
      current.automaticReview.jobId === jobId &&
      current.automaticReview.error === error
    )
      continue;
    if (state === input) state = structuredClone(state);
    state.contents.find((c) => c.id === original.id)!.automaticReview = {
      acceptanceId: acceptance.id,
      jobId,
      error,
      at: now,
    };
    changed = true;
  }
  if (state === input) return input;
  if (changed && state.version === input.version) state.version++;
  if (changed)
    state.audit.push({
      id: crypto.randomUUID(),
      actor: "studio-review-orchestration",
      action: "review.preparation_checked",
      target: "workspace",
      at: now,
    });
  return state;
}
