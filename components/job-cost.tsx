import type { Job, StudioState } from "@/lib/studio/types";
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export function JobCost({ job }: { job: Job }) {
  return (
    <details>
      <summary>Usage and cost details</summary>
      <p>
        Quoted maximum: {dollars(job.estimate)} · Still reserved:{" "}
        {dollars(job.reserved)} · Recorded cost:{" "}
        {job.actual === undefined ? "not settled" : dollars(job.actual)}.
      </p>
      {job.providerUsage ? (
        <p>
          Input: {job.providerUsage.inputTokens.toLocaleString()} tokens ·
          Output: {job.providerUsage.outputTokens.toLocaleString()} tokens
          {job.providerUsage.cacheReadTokens ||
          job.providerUsage.cacheCreationTokens
            ? ` · Cache read: ${job.providerUsage.cacheReadTokens} · Cache creation: ${job.providerUsage.cacheCreationTokens}`
            : ""}
          .
        </p>
      ) : (
        <p>No provider token usage was recorded for this request.</p>
      )}
      <p>
        {job.costBasis === "provider_usage"
          ? "Calculated from provider token usage and qualified USD rates, rounded up to cents. This is not an invoice."
          : job.costBasis === "human_reconciled"
            ? "Cost was recorded through human billing reconciliation."
            : job.actual !== undefined
              ? "Recorded cost; billing basis is retained in workspace history."
              : "Reservation stays held until supported usage or human billing reconciliation settles the amount."}
      </p>
    </details>
  );
}
export function PostCost({
  state,
  contentId,
}: {
  state: StudioState;
  contentId: string;
}) {
  const content = state.contents.find((c) => c.id === contentId),
    jobs = state.jobs.filter((j) => j.contentId === contentId),
    recorded = jobs.reduce((n, j) => n + (j.actual ?? 0), 0),
    reserved = jobs
      .filter((j) => j.actual === undefined)
      .reduce((n, j) => n + j.reserved, 0);
  const prep = state.preparations?.find((p) => p.id === content?.preparationId),
    cap = Math.min(
      prep?.maxCents ?? state.settings.reviewPolicy?.packageCap ?? 200,
      200,
    ),
    remaining = Math.max(0, cap - recorded - reserved);
  return (
    <section aria-label="Post cost">
      <p>
        Post allowance: {dollars(cap)} · Recorded: {dollars(recorded)} ·
        Reserved: {dollars(reserved)} · Remaining: {dollars(remaining)}.
      </p>
      <p>
        Includes idea, writing and review jobs allocated to this post.
        Usage-priced amounts are rounded up; unsettled requests keep their
        reservations. The founder’s monthly cap also applies.
      </p>
    </section>
  );
}
