import type { Job } from "./types";
/** Stable request identity: derived from the durable ID, never from list position. */
export function ideaRequestNumber(job: Pick<Job, "id">) {
  return `IDEA-${job.id
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8)
    .toUpperCase()}`;
}
export function ideaRequestBrief(job: Pick<Job, "prompt">) {
  try {
    const input = JSON.parse(job.prompt);
    return typeof input.topic === "string"
      ? input.topic
      : typeof input.brief === "string"
        ? input.brief
        : "Original topic not recorded";
  } catch {
    return "Original topic not recorded";
  }
}
