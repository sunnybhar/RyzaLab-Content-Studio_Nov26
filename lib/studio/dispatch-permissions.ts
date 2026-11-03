import {isActiveChannel} from "./active-channels";
import { copyIdentity, currentCopyAcceptance } from "./solo-quality";
import type { Actor, Job, StudioState } from "./types";
import { researchSourcesCurrent } from "./research-link";
import { can } from "./permissions";
import { canReadNewsletterSource } from "./newsletter-source";

// Recheck authority before disclosure to a provider, not merely at settlement.
export function canDispatchJob(state: StudioState, actor: Actor, job: Job) {
  if(!isActiveChannel(job.channel))return false;
  const connection=state.connections.find(c=>c.id===job.connectionId);
  if(connection && connection.function!==job.kind && !connection.supportedFunctions?.some(kind=>kind===job.kind))return false;
  const content = job.contentId
    ? state.contents.find((item) => item.id === job.contentId)
    : undefined;
  if (
    job.contentId &&
    (!content ||
      content.deletedAt ||
      content.channel !== job.channel ||
      content.account !== job.account)
  )
    return false;

  if (
    content &&
    job.outputContract &&
    (!job.targetIdentity ||
      job.targetIdentity !== copyIdentity(content, state) ||
      (job.outputContract === "draft_v1" &&
        (content.revision !== job.targetRevision ||
          currentCopyAcceptance(content, state))))
  )
    return false;

  if(!researchSourcesCurrent(state,actor,job))return false;
  const scope = {
    channel: job.channel,
    function: job.kind,
    contentId: job.contentId,
    account: content?.account ?? job.account,
    assignedTo: content?.assignedTo,
  };
  if (content && !canReadNewsletterSource(state, actor, content)) return false;
  if (!can(state, actor, "job.create", scope)) return false;
  if (content && !can(state, actor, "read", scope)) return false;
  if (
    job.outputContract === "draft_v1" &&
    !can(state, actor, "content.edit", scope)
  )
    return false;
  return true;
}
