import { StudioError } from "./permissions";
import type { Channel, StudioState } from "./types";

/** Retired channel identifiers remain readable in historical snapshots only. */
export const ACTIVE_CHANNELS = [
  "LinkedIn",
  "Instagram",
  "YouTube",
  "Reddit",
  "Newsletter",
] as const satisfies readonly Channel[];
export function isActiveChannel(
  channel: string,
): channel is (typeof ACTIVE_CHANNELS)[number] {
  return (ACTIVE_CHANNELS as readonly string[]).includes(channel);
}
/** A non-destructive UI projection. Never persist this instead of the full state. */
export function activeStudioView(state: StudioState): StudioState {
  const visible = (item: { channel: string }) =>
    item.channel === "Shared" || isActiveChannel(item.channel);
  const contents = state.contents.filter(visible),
    ids = new Set(contents.map((c) => c.id));
  const hiddenIds = new Set(
    [
      ...state.contents,
      ...state.ideas,
      ...state.workflows,
      ...state.jobs,
      ...state.packages,
    ]
      .filter((item) => !visible(item))
      .map((item) => item.id),
  );
  return {
    ...state,
    settings: {
      ...state.settings,
      channelCaps: Object.fromEntries(
        Object.entries(state.settings.channelCaps || {}).filter(([channel]) =>
          isActiveChannel(channel),
        ),
      ),
    },
    pipelineBriefs: state.pipelineBriefs?.filter(visible),
    contents,
    ideas: state.ideas.filter(visible),
    workflows: state.workflows.filter(visible),
    references: state.references.filter(visible),
    packages: state.packages.filter(visible),
    jobs: state.jobs.filter(visible),
    templates: state.templates.filter(visible),
    recurrences: state.recurrences.filter(visible),
    schedules: state.schedules.filter((item) => ids.has(item.contentId)),
    planningTasks: state.planningTasks?.filter(visible),
    agentRuleFiles: state.agentRuleFiles?.filter(visible),
    agentPackageArchives: state.agentPackageArchives?.filter(visible),
    agentVoiceExamples: state.agentVoiceExamples?.filter(visible),
    notices: state.notices.filter(
      (item) => ![...hiddenIds].some((id) => item.eventId.includes(id)),
    ),
    audit: state.audit.filter((item) => !hiddenIds.has(item.target)),
    members: state.members.map((member) => ({
      ...member,
      grants: member.grants.filter(
        (grant) => !grant.channel || isActiveChannel(grant.channel),
      ),
    })),
  };
}

/** Block fresh work from stale tabs; historical settlement/cancellation stays possible. */
export function assertActiveRequest(
  state: StudioState,
  command: { type: string; [key: string]: unknown },
) {
  const key =
    typeof command.contentId === "string"
      ? command.contentId
      : typeof command.id === "string"
        ? command.id
        : undefined;
  const target =
    command.type.startsWith("content.") || command.type.startsWith("package.")
      ? state.contents.find((item) => item.id === key)
      : command.type.startsWith("idea.")
        ? state.ideas.find((item) => item.id === key)
        : command.type.startsWith("workflow.")
          ? state.workflows.find((item) => item.id === key)
          : undefined;
  const channel =
    typeof command.channel === "string" ? command.channel : target?.channel;
  if (channel && channel !== "Shared" && !isActiveChannel(channel))
    throw new StudioError(
      410,
      "This channel has been removed from Studio. Choose LinkedIn, Instagram, YouTube, Reddit or Newsletter.",
    );
}
