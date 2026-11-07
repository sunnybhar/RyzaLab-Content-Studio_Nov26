import type { Actor, Channel, Job, StudioState } from "./types";
import { can, requirePermission, StudioError } from "./permissions";
import { savedResearchSchema } from "./research";
import { resolvedConnection } from "./solo-quality";

export function researchSourcesCurrent(
  state: StudioState,
  actor: Actor,
  job: Job,
) {
  try {
    researchEvidence(state, actor, job.channel, job.researchJobIds);
    if (
      (job.researchJobIds || []).length !== (job.researchSnapshots || []).length
    )
      return false;
    return (job.researchSnapshots || []).every(
      (snapshot, index) =>
        snapshot.jobId === job.researchJobIds?.[index] &&
        state.jobs.find((j) => j.id === snapshot.jobId)?.result ===
          snapshot.raw,
    );
  } catch {
    return false;
  }
}

export function researchEvidence(
  state: StudioState,
  actor: Actor,
  channel: Channel,
  ids: string[] = [],
) {
  if (ids.length > 5 || new Set(ids).size !== ids.length)
    throw new StudioError(
      400,
      "Select at most five distinct research results.",
    );
  return ids.map((id) => {
    const job = state.jobs.find((j) => j.id === id);
    if (
      !job ||
      job.kind !== "research" ||
      job.state !== "succeeded" ||
      !job.result
    )
      throw new StudioError(
        409,
        "Select completed cited research you can access. Failed or uncertain research cannot be used as evidence.",
      );
    requirePermission(state, actor, "read", {
      channel: job.channel,
      contentId: job.contentId,
      account: job.account,
      assignedTo: state.contents.find((c) => c.id === job.contentId)
        ?.assignedTo,
    });
    if (job.createdBy !== actor.email && !can(state, actor, "users.manage"))
      throw new StudioError(403, "This research belongs to another creator.");
    if (job.contentId) {
      const source = state.contents.find(
        (c) => c.id === job.contentId && !c.deletedAt,
      );
      if (!source)
        throw new StudioError(403, "Research source draft is unavailable.");
    }
    let value;
    try {
      value = savedResearchSchema.parse(JSON.parse(job.result));
    } catch {
      throw new StudioError(
        422,
        "Research needs source review: missing citations, incomplete response or search errors. No generation started.",
      );
    }
    return {
      jobId: job.id,
      requestedAt: job.createdAt,
      provider: job.connectionSnapshot?.provider,
      model: job.connectionSnapshot?.model,
      ...value,
    };
  });
}

export function researchJobInput(
  state: StudioState,
  actor: Actor,
  input: {
    channel: Channel;
    contentId?: string;
    query: string;
    idempotencyKey: string;
  },
) {
  const content = input.contentId
    ? state.contents.find((c) => c.id === input.contentId && !c.deletedAt)
    : undefined;
  if (input.contentId && (!content || content.channel !== input.channel))
    throw new StudioError(409, "Select the current draft in this channel.");
  const scope = {
    channel: input.channel,
    contentId: content?.id,
    account: content?.account,
    assignedTo: content?.assignedTo,
    function: "research" as const,
  };
  requirePermission(state, actor, "read", scope);
  requirePermission(state, actor, "job.create", scope);
  if (content) requirePermission(state, actor, "content.edit", scope);
  const connectionId = resolvedConnection(state, input.channel, "research");
  if (!connectionId)
    throw new StudioError(
      409,
      "Set up and validate a Claude Research connection in AI & budgets, then select it for Research in the channel workflow or workspace defaults.",
    );
  if (
    state.jobs.some(
      (j) =>
        j.kind === "research" &&
        j.channel === input.channel &&
        j.contentId === input.contentId &&
        j.createdBy === actor.email &&
        ["queued", "running", "unknown", "awaiting_confirmation"].includes(
          j.state,
        ) &&
        j.idempotencyKey !== input.idempotencyKey,
    )
  )
    throw new StudioError(
      409,
      "Resolve the existing research request before starting another. No automatic paid retry was made.",
    );
  // Only this explicit public query is sent. Never append private draft or workflow text.
  return {
    type: "job.enqueue" as const,
    kind: "research" as const,
    channel: input.channel,
    contentId: content?.id,
    connectionId,
    prompt: input.query,
    estimate: 0,
    idempotencyKey: input.idempotencyKey,
  };
}

/** Authorization and replay checks run before any external request. */
export function publicRetrievalTarget(state: StudioState, actor: Actor, input: {
 channel: Channel; contentId?: string; expectedRevision?: number; query: string; idempotencyKey: string;
}) {
 const content=input.contentId?state.contents.find(c=>c.id===input.contentId&&!c.deletedAt):undefined;
 if(input.contentId&&(!content||content.channel!==input.channel||content.revision!==input.expectedRevision))throw new StudioError(409,"Draft changed. Refresh before retrieving references.");
 const scope={channel:input.channel,contentId:content?.id,account:content?.account,assignedTo:content?.assignedTo,function:"research" as const};
 requirePermission(state,actor,"read",scope);requirePermission(state,actor,"job.create",scope);
 if(content)requirePermission(state,actor,"content.edit",scope);
 const existing=state.jobs.find(j=>j.createdBy===actor.email&&j.idempotencyKey===input.idempotencyKey);
 if(existing&&(existing.connectionId!=="public-reference-retrieval"||existing.channel!==input.channel||existing.contentId!==input.contentId||existing.prompt!==input.query))throw new StudioError(409,"This request key belongs to a different operation.");
 return {content,existing};
}
