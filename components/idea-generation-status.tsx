"use client";
import { useEffect, useRef, useState } from "react";
import type { Actor, Channel, Command, StudioState } from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export function IdeaGenerationStatus({
  state,
  actor,
  channel,
  live,
  refresh,
  send,
}: {
  state: StudioState;
  actor: Actor;
  channel: Channel | "All channels";
  live: boolean;
  refresh: () => Promise<void>;
  send: (command: Command) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [syncError, setSyncError] = useState("");
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const jobs = state.jobs
    .filter(
      (j) =>
        j.kind === "ideas" &&
        (channel === "All channels" || j.channel === channel),
    )
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const pending = jobs.some((j) =>
    ["awaiting_confirmation", "queued", "running"].includes(j.state),
  );
  useEffect(() => {
    if (!live || !pending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        await refreshRef.current();
        if (!stopped) setSyncError("");
      } catch {
        if (!stopped)
          setSyncError(
            "Status could not be refreshed. Last known status is shown; do not submit another request.",
          );
      } finally {
        if (!stopped) timer = setTimeout(poll, 5000);
      }
    }
    timer = setTimeout(poll, 3000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [live, pending]);
  async function command(c: Command) {
    setBusy(true);
    setError("");
    try {
      await send(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Job action failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!jobs.length) return null;
  return (
    <section
      className="s-panel s-idea-generation"
      aria-label="Idea generation status"
    >
      <div className="s-section-heading">
        <div>
          <h2>Idea generation</h2>
          <p>
            Track your existing requests here. Generated cards appear below when
            the result is imported.
          </p>
        </div>
        <button
          className="s-btn"
          disabled={busy}
          onClick={async () => {
            try {
              await refreshRef.current();
              setSyncError("");
            } catch {
              setSyncError(
                "Could not refresh status. Try again without resubmitting generation.",
              );
            }
          }}
        >
          Refresh generation status
        </button>
      </div>
      {error && (
        <p role="alert" className="s-red-text">
          {error}
        </p>
      )}
      {syncError && <p role="alert">{syncError}</p>}
      {jobs.map((job) => {
        const count = state.ideas.filter(
          (i) => i.generationRunId === job.id,
        ).length;
        const authorized =
          can(state, actor, "job.create", {
            channel: job.channel,
            function: job.kind,
            contentId: job.contentId,
            account: job.account,
            assignedTo: job.contentId
              ? state.contents.find((c) => c.id === job.contentId)?.assignedTo
              : undefined,
          }) &&
          (job.createdBy === actor.email ||
            can(state, actor, "settings.manage"));
        const label =
          job.state === "awaiting_confirmation"
            ? "Waiting for your cost confirmation"
            : job.state === "queued"
              ? "Queued — waiting for worker"
              : job.state === "running"
                ? "Agent is generating ideas"
                : job.state === "succeeded" && count
                  ? `${count} ideas ready for review`
                  : job.state === "succeeded"
                    ? "Provider finished — result needs attention"
                    : job.state === "unknown"
                      ? "Outcome uncertain — reconcile before retrying"
                      : job.state === "blocked"
                        ? "Generation blocked"
                        : job.state === "failed"
                          ? "Generation failed"
                          : "Generation cancelled";
        return (
          <article
            className="s-idea-job"
            key={job.id}
            data-job-state={job.state}
          >
            <div className="s-idea-job-heading">
              <strong>
                {job.channel} · {label}
              </strong>
              <span>{money(job.estimate)} estimated</span>
            </div>
            {["queued", "running"].includes(job.state) && (
              <>
                <progress aria-label={label} />
                <p role="status">
                  {job.state === "queued"
                    ? "Your request is saved. The worker checks the queue periodically. No finished ideas yet."
                    : "The provider request has started. This page refreshes automatically; exact completion percentage is unavailable."}
                </p>
              </>
            )}
            {job.state === "awaiting_confirmation" && (
              <>
                <p>
                  No agent request has started. Confirm the estimated budget
                  reservation to queue this job. Final charges may differ;
                  Studio caps still apply.
                </p>
                <div className="s-actions">
                  <button
                    className="s-btn s-primary"
                    disabled={busy || !authorized}
                    onClick={() =>
                      void command({ type: "job.confirm", id: job.id })
                    }
                  >
                    Confirm idea generation {money(job.estimate)}
                  </button>
                  <button
                    className="s-btn"
                    disabled={busy || !authorized}
                    onClick={() =>
                      void command({ type: "job.cancel", id: job.id })
                    }
                  >
                    Cancel idea request
                  </button>
                </div>
              </>
            )}
            {job.state === "queued" && (
              <button
                className="s-btn"
                disabled={busy || !authorized}
                onClick={() => void command({ type: "job.cancel", id: job.id })}
              >
                Cancel queued request
              </button>
            )}
            {job.state === "succeeded" && count > 0 && (
              <p role="status">
                {count} agent-generated cards have been added. They remain
                pending human review; use All ideas or Pending and clear search
                to see them.
              </p>
            )}
            {job.error && (
              <p
                className={
                  ["failed", "blocked", "unknown"].includes(job.state)
                    ? "s-red-text"
                    : "s-muted"
                }
              >
                {job.error}
              </p>
            )}
            {job.state === "succeeded" && !count && (
              <p>
                No idea cards were imported from this result. Inspect the
                provider result in AI & budgets before requesting another paid
                run.
              </p>
            )}
            {["unknown", "failed", "blocked"].includes(job.state) && (
              <p>
                Check this job in AI & budgets. Do not resubmit until the
                failure or uncertain outcome is resolved.
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
