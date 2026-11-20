"use client";
import { useEffect, useState } from "react";
import type { Job } from "@/lib/studio/types";
export function IdeaRunProgress({
  job,
  busy,
  startedAt,
  sourceCount,
  readyCount,
  targetCount,
  lastChecked,
  syncError,
  requestError,
  refresh,
  confirm,
}: {
  job?: Job;
  busy: boolean;
  startedAt: number;
  sourceCount: number;
  readyCount: number;
  targetCount: number;
  lastChecked?: number;
  syncError: string;
  requestError: string;
  refresh: () => Promise<void>;
  confirm: () => Promise<void>;
}) {
  const [now, setNow] = useState(Date.now()),
    [checking, setChecking] = useState(false);
  const complete = readyCount >= targetCount && targetCount > 0,
    attention =
      Boolean(requestError) ||
      Boolean(
        job &&
        (["failed", "unknown", "blocked"].includes(job.state) ||
          (job.state === "succeeded" && !complete)),
      );
  useEffect(() => {
    if (complete || attention) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [complete, attention]);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000)),
    elapsed =
      seconds < 60
        ? `${seconds}s`
        : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const headline = complete
    ? `${readyCount} of ${targetCount} ready`
    : attention
      ? "Request needs attention"
      : job?.state === "awaiting_confirmation"
      ? "Waiting for your allowance confirmation"
      : job?.state === "running"
        ? "AI is generating your ideas"
        : job?.state === "queued"
          ? "Waiting for AI execution to start"
          : "Finding relevant public references";
  const stages = [
    [
      "1. Research",
      sourceCount
        ? `${sourceCount} saved research result(s)`
        : job
          ? "No linked research"
          : requestError
            ? "Status unavailable — see error"
            : "In progress",
    ],
    [
      "2. Allowance",
      job?.state === "awaiting_confirmation"
        ? "Your confirmation required"
        : job
          ? "Confirmed / within configured limits"
          : requestError
            ? "Not available"
            : "Waiting",
    ],
    [
      "3. Generate ideas",
      job?.state === "awaiting_confirmation"
        ? "Not started — waiting for approval"
        : job?.state === "running"
        ? "In progress"
        : complete
          ? "Finished"
          : attention
            ? job
              ? "Stopped — inspect saved request"
              : "No result — see error"
            : job?.state === "queued"
              ? "Queued"
              : "Waiting",
    ],
    [
      "4. Results",
      complete ? `${readyCount} of ${targetCount} ready` : "Not ready yet",
    ],
  ];
  return (
    <section
      className="s-idea-run-progress"
      aria-label="Research and idea progress"
    >
      <h3>Research and idea progress</h3>
      <p role="status" aria-live="polite">
        <strong>{headline}</strong>
      </p>
      {requestError && (
        <div className="s-alert s-error" role="alert" style={{display:"block",overflowWrap:"anywhere"}}>
          <strong>Request error</strong>
          <p>{requestError}</p>
          {!job && (
            <p>
              No saved idea request is loaded. Check the error above before
              retrying; this page will not retry automatically.
            </p>
          )}
        </div>
      )}
      <ol>
        {stages.map(([name, status]) => (
          <li key={name}>
            <strong>{name}</strong>
            <span>{status}</span>
          </li>
        ))}
      </ol>
      <p>
        Elapsed: {elapsed}.{" "}
        {job?.state === "awaiting_confirmation"
          ? "AI generation has not started."
          : job?.state === "running"
            ? "The provider does not report a percentage; this shows the actual request stage."
            : ""}
      </p>
      {job?.state === "awaiting_confirmation" && <p>This is the approved maximum, not the final cost. Unused reservation is released after confirmed settlement; uncertain outcomes retain their reservation.</p>}
      {job?.state === "awaiting_confirmation" && (
        <button
          type="button"
          className="s-btn s-primary"
          disabled={busy}
          onClick={() => void confirm()}
        >
          Approve up to ${(job.estimate / 100).toFixed(2)}
        </button>
      )}
      {job && (
        <>
          <button
            className="s-btn"
            type="button"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              try {
                await refresh();
              } finally {
                setChecking(false);
              }
            }}
          >
            {checking ? "Checking status…" : "Check status — no new AI request"}
          </button>
          <p>
            {lastChecked
              ? `Status last checked ${new Date(lastChecked).toLocaleTimeString()}`
              : "Waiting for a status check."}
          </p>
        </>
      )}
      {seconds > 100 && job?.state === "running" && (
        <p>
          This is taking longer than expected. Check the existing request; do
          not start another paid generation.
        </p>
      )}
      {syncError && <p role="alert">{syncError}</p>}
      {job?.error && <p>{job.error}</p>}
      {job?.state === "unknown" && (
        <p>The outcome is uncertain. No automatic paid retry will be made.</p>
      )}
    </section>
  );
}
