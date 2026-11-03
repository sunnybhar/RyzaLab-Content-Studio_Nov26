import type { Idea, Job } from "./types";
import { ideaRequestBrief, ideaRequestNumber } from "./idea-request";
export type IdeaStage = "new" | "shortlisted" | "ready";
export const IDEA_STAGES = ["new", "shortlisted", "ready"] as const;
export const ideaStage = (idea: Idea): IdeaStage =>
  idea.boardStage || (idea.state === "approved" ? "ready" : "new");
export type IdeaRequestGroup = {
  id: string;
  number: string;
  topic: string;
  createdAt: string;
  channel: string;
  ideas: Idea[];
  job?: Job;
};
export function ideaRequestGroups(
  ideas: Idea[],
  jobs: Job[],
): IdeaRequestGroup[] {
  const groups = new Map<string, IdeaRequestGroup>();
  for (const job of jobs.filter(
    (job) => job.kind === "ideas" && !job.ideaPurpose,
  ))
    groups.set(job.id, {
      id: job.id,
      number: ideaRequestNumber(job),
      topic: ideaRequestBrief(job),
      createdAt: job.createdAt,
      channel: job.channel,
      ideas: [],
      job,
    });
  for (const idea of ideas) {
    const key = idea.generationRunId || `manual:${idea.id}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        id: key,
        number: idea.generationRunId
          ? ideaRequestNumber({ id: idea.generationRunId })
          : `MANUAL-${idea.id
              .replace(/[^a-z0-9]/gi, "")
              .slice(0, 8)
              .toUpperCase()}`,
        topic: idea.generationRunId
          ? "Original topic not recorded"
          : idea.brief || idea.title,
        createdAt: idea.createdAt,
        channel: idea.channel,
        ideas: [],
      };
      groups.set(key, group);
    }
    group.ideas.push(idea);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
}
