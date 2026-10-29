import type { Actor, FunctionKind, StudioState } from "./types";
import { resolvedConnection, currentCopyAcceptance } from "./solo-quality";
import { requirePermission, StudioError } from "./permissions";
import { contentWording } from "./content-wording";
export function generationInput(
  state: StudioState,
  actor: Actor,
  input: {
    contentId: string;
    kind: "text" | "review";
    expectedRevision: number;
    notes?: string;
    idempotencyKey: string;
  },
) {
  const c = state.contents.find(
    (c) => c.id === input.contentId && !c.deletedAt,
  );
  if (!c || c.revision !== input.expectedRevision)
    throw new StudioError(
      409,
      "The draft changed; open the current revision before generating.",
    );
  const scope = {
    channel: c.channel,
    account: c.account,
    contentId: c.id,
    assignedTo: c.assignedTo,
    function: input.kind as FunctionKind,
  };
  requirePermission(state, actor, "read", scope);
  requirePermission(state, actor, "job.create", scope);
  if (input.kind === "text")
    requirePermission(state, actor, "content.edit", scope);
  const connectionId = resolvedConnection(state, c.channel, input.kind);
  if (!connectionId)
    throw new StudioError(
      409,
      `Connect ${input.kind === "text" ? "Writing" : "Review"} in AI setup or choose a channel override. Your draft is already saved.`,
    );
  const idea = state.ideas.find((i) => i.id === c.ideaId);
  const prompt = JSON.stringify({
    task:
      input.kind === "text"
        ? "Write or revise only this selected piece. Return the complete draft JSON contract; never a weekly pack or instructions in the body."
        : "Review only this exact candidate against supplied references. Return the review JSON contract. Do not invent source access or visual inspection.",
    channel: c.channel,
    account: c.account,
    format: c.format,
    title: c.title,
    idea: idea
      ? { title: idea.title, brief: idea.brief, sources: idea.sources }
      : null,
    currentCopy: contentWording(c),
    notes: input.notes || "",
    copyAccepted: Boolean(currentCopyAcceptance(c, state)),
  });
  return {
    type: "job.enqueue" as const,
    kind: input.kind,
    channel: c.channel,
    contentId: c.id,
    connectionId,
    prompt,
    estimate: 0,
    idempotencyKey: input.idempotencyKey,
  };
}
