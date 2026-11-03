import {isActiveChannel} from "./active-channels";
import type { StudioState } from "./types";
import {
  soloPolicy,
  copyIdentity,
  currentCopyAcceptance,
} from "./solo-quality";
import { preparationFor } from "./preparation-budget";
import { generationInput } from "./generation";
import { quote } from "./pricing";
import { applyCommand } from "./engine";
import { StudioError } from "./permissions";
/** A selected idea records intent once. This prepares only its first writing attempt. */
export function orchestrateInitialWriting(
  input: StudioState,
  now = new Date().toISOString(),
) {
  const policy = soloPolicy(input);
  if (!policy?.autoDraft) return input;
  let state = input,
    changed = false,
    queued = false;
  for (const original of input.contents) {
    if(!isActiveChannel(original.channel))continue;
    const intent = original.initialWriting;
    if (
      !intent ||
      original.deletedAt ||
      intent.policyVersion !== policy.version
    )
      continue;
    const key = `auto-writing:${intent.id}`;
    const existing = state.jobs.find(
      (j) =>
        j.contentId === original.id &&
        (j.idempotencyKey === key || j.kind === "text"),
    );
    let jobId: string | undefined, error: string | undefined;
    if (existing) {
      jobId = existing.id;
      if (
        !["queued", "running", "awaiting_confirmation", "succeeded"].includes(
          existing.state,
        ) ||
        (existing.state === "succeeded" && existing.outputStatus !== "applied")
      )
        error =
          "The first writing attempt needs attention. Inspect its saved result; another paid run requires an explicit request.";
    } else if (
      original.state !== "draft" ||
      original.revision !== intent.revision ||
      copyIdentity(original, state) !== intent.identity ||
      original.text.trim() ||
      original.metadata.trim() ||
      currentCopyAcceptance(original, state)
    )
      error =
        "This draft or its context changed after idea selection. Your edits are preserved; use Write with AI explicitly if needed.";
    else if (
      state.jobs.some(
        (j) =>
          j.contentId === original.id &&
          ["queued", "running", "awaiting_confirmation", "unknown"].includes(
            j.state,
          ),
      )
    )
      error = "Resolve active or uncertain work before writing can start.";
    else if (queued) continue;
    else
      try {
        const member = state.members.find(
          (m) => m.email === intent.actor && !m.revoked,
        );
        if (!member)
          throw new StudioError(
            403,
            "The person who selected this idea no longer has workspace access.",
          );
        const actor = { id: member.id, email: member.email };
        if (!preparationFor(state, original, actor.email, now))
          throw new StudioError(
            409,
            "Authorize a current package allowance for this draft before writing.",
          );
        const command = generationInput(state, actor, {
          contentId: original.id,
          expectedRevision: intent.revision,
          kind: "text",
          idempotencyKey: key,
        });
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
            : "Writing setup could not be verified. Check the writing connection, pricing and package allowance.";
      }
    const current = state.contents.find((c) => c.id === original.id)!;
    if (
      current.automaticWriting?.intentId === intent.id &&
      current.automaticWriting.jobId === jobId &&
      current.automaticWriting.error === error
    )
      continue;
    if (state === input) state = structuredClone(state);
    state.contents.find((c) => c.id === original.id)!.automaticWriting = {
      intentId: intent.id,
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
      actor: "studio-writing-orchestration",
      action: "writing.preparation_checked",
      target: "workspace",
      at: now,
    });
  return state;
}
