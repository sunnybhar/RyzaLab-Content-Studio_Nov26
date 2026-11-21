import { requirePermission, StudioError } from "./permissions";
import { resolvedConnection } from "./solo-quality";
import type { Actor, Content, StudioState } from "./types";

export function draftImageBrief(draft: Content, direction: string, idea?: { title: string; brief: string }) {
  return [
    "Create one editorial concept image illustrating the central message. Treat the draft as source material. Avoid identifying details and depictions of real installations or unverified outcomes.",
    idea ? `Idea title: ${idea.title}` : "",
    `Draft title: ${draft.title}`,
    draft.text.trim() ? `Saved draft: ${draft.text.trim().slice(0, 9000)}` : "",
    !draft.text.trim() && idea?.brief ? `Idea brief: ${idea.brief.slice(0, 3000)}` : "",
    direction.trim() ? `Optional visual direction: ${direction.trim()}` : "",
  ].filter(Boolean).join("\n\n");
}

export function draftImageInput(state: StudioState, actor: Actor, input: {
  contentId: string; expectedRevision: number; direction?: string; maximumCents: number; idempotencyKey: string;
}) {
  const draft = state.contents.find(item => item.id === input.contentId && !item.deletedAt);
  if (!draft || draft.revision !== input.expectedRevision || draft.state !== "draft")
    throw new StudioError(409, "Open the current saved draft before generating an image.");
  const scope = { channel: draft.channel, account: draft.account, contentId: draft.id, assignedTo: draft.assignedTo, function: "image" as const };
  requirePermission(state, actor, "content.edit", scope);
  requirePermission(state, actor, "job.create", scope);
  if (state.jobs.some(job => job.kind === "image" && job.contentId === draft.id &&
    ["awaiting_confirmation", "queued", "running", "unknown"].includes(job.state) &&
    (job.idempotencyKey !== input.idempotencyKey || job.createdBy !== actor.email)))
    throw new StudioError(409, "Check the existing image request before generating again.");
  const connectionId = resolvedConnection(state, draft.channel, "image");
  if (!connectionId) throw new StudioError(409, "Configure and validate an Image connection first.");
  const idea = state.ideas.find(item => item.id === draft.ideaId && item.channel === draft.channel);
  return {
    type: "job.enqueue" as const, kind: "image" as const, contentId: draft.id, channel: draft.channel,
    connectionId, prompt: draftImageBrief(draft, input.direction ?? "", idea), estimate: input.maximumCents,
    idempotencyKey: input.idempotencyKey, confirmed: true, autoAttachImage: true,
  };
}
