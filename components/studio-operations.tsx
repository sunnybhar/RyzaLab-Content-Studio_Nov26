"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { StudioState } from "@/lib/studio/types";
import { operationsSummary } from "@/lib/studio/operations";
export function StudioOperations({
  state,
  live,
  openJobs,
}: {
  state: StudioState;
  live: boolean;
  openJobs: () => void;
}) {
  const [result, setResult] = useState<{
    summary: ReturnType<typeof operationsSummary>;
    checks?: Record<string, string | boolean | number>;
  }>(() => ({ summary: operationsSummary(state) }));
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      if (!live) {
        setResult({ summary: operationsSummary(state) });
        return;
      }
      const session = await supabase?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Sign in for health checks.");
      const response = await fetch("/api/studio/health", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Health check failed.");
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const summary = result.summary;
  return (
    <section className="s-panel s-analytics-section">
      <div className="s-section-heading">
        <h2>Operations and incidents</h2>
        <button
          className="s-btn"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Checking…" : "Refresh health checks"}
        </button>
      </div>
      {error && (
        <p role="alert" className="s-red-text">
          {error}
        </p>
      )}
      <p>
        Checked {new Date(summary.checkedAt).toLocaleString()} · workspace
        version {summary.workspaceVersion} ·{" "}
        {(summary.workspaceBytes / 1024 / 1024).toFixed(2)} MB of 24 MB current
        command-store limit.
      </p>
      <p>
        Worker heartbeat is not tracked. Reachable web/database services do not
        prove that Render is currently processing; inspect Render logs and queue
        age.
      </p>
      {!live && (
        <p>
          Preview shows local records only. No external health probe was made.
        </p>
      )}
      {result.checks && (
        <dl className="s-health-checks">
          {Object.entries(result.checks).map(([name, value]) => (
            <div key={name}>
              <dt>{name.replace(/([A-Z])/g, " $1")}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p>
        {summary.queued} queued · {summary.running} running ·{" "}
        {summary.awaitingConfirmation} awaiting confirmation ·{" "}
        {summary.unreconciled} completed jobs with costs awaiting
        reconciliation.
      </p>
      <h3>Job alerts ({summary.openAlerts})</h3>
      {summary.alerts.length === 0 ? (
        <p>No job alerts in current records.</p>
      ) : (
        summary.alerts.map((alert) => (
          <article className="s-idea-job" key={alert.id}>
            <strong>
              {alert.severity} · {alert.function} · {alert.channel} ·{" "}
              {alert.state}
            </strong>
            <p>{alert.reason}</p>
            <small>
              Job {alert.id} · reservation ${(alert.reserved / 100).toFixed(2)}
            </small>
          </article>
        ))
      )}
      <h3>Google Docs</h3>
      <p>
        {summary.docsConflicts.length} conflicts · {summary.docsErrors.length}{" "}
        synchronization errors. Review the linked drafts before importing
        changes.
      </p>
      <button className="s-btn" onClick={openJobs}>
        Open jobs and reconciliation
      </button>
      <p>
        Never retry an uncertain provider outcome blindly. Alerts retain source
        errors as plain text; credential values are never displayed.
      </p>
    </section>
  );
}
