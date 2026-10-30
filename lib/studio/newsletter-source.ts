import type { Actor, Content, StudioState } from "./types";
import { can } from "./permissions";

/** Linked source is an intentional snapshot; generation still requires current source access. */
export function canReadNewsletterSource(state: StudioState, actor: Actor, content: Content) {
  const source = content.newsletterSource;
  if (!source) return true;
  if (source.kind === "idea") {
    const idea = state.ideas.find(i => i.id === source.id);
    return Boolean(idea && can(state, actor, "read", { channel: idea.channel }));
  }
  const original = state.contents.find(c => c.id === source.id && !c.deletedAt);
  return Boolean(original && can(state, actor, "read", { channel: original.channel, account: original.account, contentId: original.id, assignedTo: original.assignedTo }));
}
