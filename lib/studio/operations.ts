import type { StudioState } from "./types";
export function operationsSummary(
  state: StudioState,
  now = new Date().toISOString(),
) {
  const alerts = state.jobs.flatMap((job) => {
    const expired =
      job.state === "running" &&
      Boolean(job.leaseUntil && job.leaseUntil < now);
    const waiting =
      job.state === "queued" &&
      Date.parse(job.createdAt) < Date.parse(now) - 900000;
    if (
      !expired &&
      !waiting &&
      !["unknown", "failed", "blocked"].includes(job.state)
    )
      return [];
    return [
      {
        id: job.id,
        severity: job.state === "unknown" || expired ? "critical" : "warning",
        function: job.kind,
        channel: job.channel,
        state: job.state,
        reserved: job.reserved,
        reason:
          job.state === "unknown" || expired
            ? "Outcome uncertain. Reconcile before any retry."
            : waiting
              ? "Queued over 15 minutes. Check worker logs; do not submit a duplicate."
              : job.error || "Job needs review.",
      },
    ];
  });
  return {
    checkedAt: now,
    workspaceVersion: state.version,
    workspaceBytes: new TextEncoder().encode(JSON.stringify(state)).length,
    openAlerts: alerts.length,
    alerts,
    awaitingConfirmation: state.jobs.filter(
      (j) => j.state === "awaiting_confirmation",
    ).length,
    queued: state.jobs.filter((j) => j.state === "queued").length,
    running: state.jobs.filter((j) => j.state === "running").length,
    unreconciled: state.jobs.filter(
      (j) =>
        j.state === "succeeded" && j.reserved > 0 && j.actual === undefined,
    ).length,
    docsConflicts: state.contents
      .filter((c) => !c.deletedAt && c.docsIncoming)
      .map((c) => ({ id: c.id, title: c.title })),
    docsErrors: state.contents
      .filter((c) => !c.deletedAt && c.docsSyncError)
      .map((c) => ({ id: c.id, title: c.title })),
    workerHeartbeat: "not_tracked",
  };
}
