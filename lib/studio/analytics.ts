import { CHANNELS, type StudioState, type Channel } from "./types";
import { stageSummary } from "./stages";
export function studioAnalytics(
  state: StudioState,
  channel: Channel | "All channels",
  days: number,
  now = new Date(),
) {
  const matches = (x: { channel: Channel }) =>
    channel === "All channels" || x.channel === channel;
  const contents = state.contents.filter((c) => !c.deletedAt && matches(c));
  const ids = new Set(contents.map((c) => c.id));
  const cutoff = now.getTime() - days * 86400000;
  const within = (value?: string) =>
    Boolean(
      value &&
      Date.parse(value) >= cutoff &&
      Date.parse(value) <= now.getTime(),
    );
  const schedules = state.schedules.filter((s) => ids.has(s.contentId));
  const publications = schedules.filter(
    (s) =>
      s.state === "published" &&
      s.confirmedAt &&
      s.verification === "human_confirmed",
  );
  const packages = state.packages.filter((p) => ids.has(p.contentId));
  const jobs = state.jobs.filter(matches);
  const activity = Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getTime() - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      publications: publications.filter(
        (s) => s.confirmedAt?.slice(0, 10) === date,
      ).length,
      approvals: packages.filter((p) => p.approvedAt.slice(0, 10) === date)
        .length,
    };
  });
  const bottlenecks = new Map<string, number>();
  for (const content of contents) {
    const summary = stageSummary(content, state);
    if (summary.bucket !== "Published")
      bottlenecks.set(summary.label, (bottlenecks.get(summary.label) || 0) + 1);
  }
  return {
    contents: contents.length,
    drafts: contents.filter((c) => c.state === "draft").length,
    inReview: contents.filter((c) => c.state === "review").length,
    changes: contents.filter((c) => c.state === "changes").length,
    approvedContents: new Set(packages.map((p) => p.contentId)).size,
    packages: packages.length,
    published: new Set(publications.map((s) => s.contentId)).size,
    planned: schedules.filter((s) => s.state === "planned").length,
    blocked: schedules.filter((s) => s.state === "blocked").length,
    taskCount: (state.planningTasks || []).filter(
      (t) => matches(t) && t.state === "planned",
    ).length,
    periodApprovals: packages.filter((p) => within(p.approvedAt)).length,
    periodPublications: publications.filter((s) => within(s.confirmedAt))
      .length,
    updated: contents.filter((c) => within(c.updatedAt)).length,
    actualCost: jobs.reduce((sum, j) => sum + (j.actual ?? 0), 0),
    reserved: jobs.reduce((sum, j) => sum + (j.reserved || 0), 0),
    jobs: jobs.length,
    failedJobs: jobs.filter(
      (j) => j.state === "failed" || j.state === "unknown",
    ).length,
    channels: CHANNELS.filter(
      (c) => channel === "All channels" || channel === c,
    ).map((channel) => ({
      channel,
      content: contents.filter((c) => c.channel === channel).length,
      approved: new Set(
        packages.filter((p) => p.channel === channel).map((p) => p.contentId),
      ).size,
      published: new Set(
        publications
          .filter(
            (s) =>
              state.contents.find((c) => c.id === s.contentId)?.channel ===
              channel,
          )
          .map((s) => s.contentId),
      ).size,
    })),
    bottlenecks: [...bottlenecks.entries()].map(([stage, count]) => ({
      stage,
      count,
    })),
    activity,
  };
}
