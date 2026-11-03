import type { Job } from "./types";
/** Report the selected compiled context, not files omitted to fit the request. */
export function generationRulesEvidence(job: Job) {
  if (!job.systemSnapshot)
    return { context: job.agentContextSnapshot, exact: false };
  const match = job.systemSnapshot.match(/AGENT RULES AND VOICE:\n([^\n]*)/);
  if (!match) return { context: undefined, exact: true };
  try {
    const context = JSON.parse(match[1]) as NonNullable<
      Job["agentContextSnapshot"]
    >;
    if (!Array.isArray(context.rules) || !Array.isArray(context.voice))
      return { context: undefined, exact: false };
    return { context, exact: true };
  } catch {
    return { context: undefined, exact: false };
  }
}
