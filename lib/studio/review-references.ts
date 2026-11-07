import type { Job } from "./types";
/** Canonical prompts freeze the exact evidence IDs and locally selected reference passages supplied to review. */
export function suppliedReviewReferences(job: Job) {
  let selected: Set<string> | undefined;
  const marker = "\nCONTEXT COVERAGE:\n",
    at = job.systemSnapshot?.lastIndexOf(marker) ?? -1;
  if (at >= 0)
    try {
      const body = job
          .systemSnapshot!.slice(at + marker.length)
          .split("\nOUTPUT CONTRACT:")[0],
        coverage = JSON.parse(body);
      if (Array.isArray(coverage.selectedReferenceIds))
        selected = new Set(coverage.selectedReferenceIds);
    } catch {}
  const allowed = new Set(
    (job.workflowSnapshot?.references || []).filter(
      (id) =>
        (!selected || selected.has(id)) &&
        (!job.referenceSnapshots ||
          job.referenceSnapshots.some(
            (reference) => (reference as { id?: string })?.id === id,
          )),
    ),
  );
  try {
    const prompt = JSON.parse(job.prompt);
    for (const evidence of prompt.webEvidence || []) {
      if (typeof evidence.jobId === "string") allowed.add(evidence.jobId);
      for (const citation of evidence.citations || [])
        if (typeof citation.referenceId === "string")
          allowed.add(citation.referenceId);
    }
    for (const source of prompt.newsletterSources || [])
      if (typeof source.referenceId === "string")
        allowed.add(source.referenceId);
  } catch {}
  return allowed;
}
