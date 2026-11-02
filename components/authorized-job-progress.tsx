"use client";
import { useEffect, useRef, useState } from "react";
import type { Actor, StudioState } from "@/lib/studio/types";
/** Only advances jobs already explicitly authorized and queued by this user. */
export function AuthorizedJobProgress({
  state,
  actor,
  demo,
  request,
  refresh,
}: {
  state: StudioState;
  actor: Actor;
  demo: boolean;
  request: (jobId: string) => Promise<unknown>;
  refresh: () => Promise<void>;
}) {
  const sampleIds = new Set(
    state.verificationRuns?.flatMap((r) =>
      r.cases.flatMap((c) => [c.ideaJobId, c.writingJobId]),
    ),
  );
  const [now, setNow] = useState(Date.now());
  const hasRunning = state.jobs.some(
    (j) => j.createdBy === actor.email && j.state === "running",
  );
  useEffect(() => {
    if (demo || !hasRunning) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      void refreshRef.current().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [demo, hasRunning]);
  const job = state.jobs.find(
    (j) =>
      j.createdBy === actor.email &&
      (j.state === "queued" ||
        (j.state === "running" &&
          Boolean(j.leaseUntil && Date.parse(j.leaseUntil) < now))) &&
      ["text", "ideas", "review"].includes(j.kind) &&
      !sampleIds.has(j.id),
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  const attempted = useRef(new Set<string>()),
    requestRef = useRef(request),
    refreshRef = useRef(refresh);
  requestRef.current = request;
  refreshRef.current = refresh;
  const attemptKey = job ? `${job.id}:${job.state}` : "";
  useEffect(() => {
    if (demo || !job || attempted.current.has(attemptKey)) return;
    attempted.current.add(attemptKey);
    let live = true;
    setBusy(true);
    setError("");
    void requestRef
      .current(job.id)
      .catch(async (e) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Authorized job needs attention.",
          );
        await refreshRef.current().catch(() => {});
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [attemptKey, demo, retry]);
  if (demo || !job) return null;
  return (
    <div className="s-panel s-panel-padding" role="status">
      {busy
        ? `Processing your authorized ${job.kind} request…`
        : error || `Your ${job.kind} request is queued.`}
      {error && (
        <button
          className="s-btn"
          onClick={() => {
            attempted.current.delete(attemptKey);
            setRetry((n) => n + 1);
          }}
        >
          Check queued request again
        </button>
      )}
    </div>
  );
}
