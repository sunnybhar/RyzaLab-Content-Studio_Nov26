"use client";
import { useState } from "react";
import type { Actor, Command, Job, StudioState } from "@/lib/studio/types";
import { canDispatchJob } from "@/lib/studio/dispatch-permissions";
import { can } from "@/lib/studio/permissions";
type Resolution = {
  outcome: "succeeded" | "failed" | "";
  amount: string;
  reason: string;
};
const statusNames: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  awaiting_confirmation: "Waiting for cost confirmation",
  unknown: "Outcome uncertain",
  failed: "Failed",
  blocked: "Blocked",
  succeeded: "Provider finished",
  cancelled: "Cancelled",
};
export function ReviewWorkStatus({
  jobs,
  state,
  actor,
  demo,
  send,
  progressJob,
}: {
  jobs: Job[];
  state: StudioState;
  actor: Actor;
  demo: boolean;
  send: (command: Command) => Promise<unknown>;
  progressJob?: (id: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The existing request could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!jobs.length)
    return (
      <p role="status">
        No current review request is visible for this copy. Use Request textual
        review below when no other work is pending.
      </p>
    );
  return (
    <section
      aria-label="Existing work blocking final approval"
      className="s-panel s-panel-padding"
    >
      <h4>Existing requests for this content</h4>
      <p>
        A writing request can block review too. Actions below update the
        existing request; they do not create another one.
      </p>
      {error && (
        <p role="alert" className="s-red-text">
          {error}
        </p>
      )}
      {jobs.map((job) => {
        const { outcome, amount, reason } = resolutions[job.id] || {
          outcome: "",
          amount: "",
          reason: "",
        };
        const update = (change: Partial<Resolution>) =>
          setResolutions((previous) => ({
            ...previous,
            [job.id]: {
              ...(previous[job.id]||{outcome:"",amount:"",reason:""}),
              ...change,
            },
          }));
        const setOutcome = (outcome: Resolution["outcome"]) =>
            update({ outcome }),
          setAmount = (amount: string) => update({ amount }),
          setReason = (reason: string) => update({ reason });
        const own = job.createdBy === actor.email,
          manage = can(state, actor, "settings.manage"),
          permission = can(state, actor, "job.create", {
            contentId: job.contentId,
            channel: job.channel,
            function: job.kind,
            account: job.account,
            assignedTo: state.contents.find((c) => c.id === job.contentId)
              ?.assignedTo,
          });
        const dispatchable =
          ["queued", "awaiting_confirmation"].includes(job.state) &&
          canDispatchJob(state, actor, job);
        const pending = [
            "queued",
            "running",
            "awaiting_confirmation",
            "unknown",
          ].includes(job.state),
          label =
            job.kind === "review"
              ? "Textual review"
              : job.kind === "text"
                ? "Writing"
                : job.kind;
        return (
          <article key={job.id} className="s-version">
            <p role="status">
              <strong>
                {label} · {statusNames[job.state] || job.state}
              </strong>
            </p>
            <p>
              Request {job.id} · Created {new Date(job.createdAt).toLocaleString()}
              {job.createdBy && !own ? ` · Requested by ${job.createdBy}` : ""}
            </p>
            {job.dispatchStartedAt&&<p>Dispatch started: {new Date(job.dispatchStartedAt).toLocaleString()}{job.leaseUntil?` · Lease ends: ${new Date(job.leaseUntil).toLocaleString()}`:""}</p>}
            {job.error && <p className="s-red-text">{job.error}</p>}
            {job.state === "awaiting_confirmation" && (
              <>
                <p>This saved request needs confirmation before it can run.</p>
                <button
                  className="s-btn"
                  disabled={
                    busy || !permission || !dispatchable || (!own && !manage)
                  }
                  onClick={() =>
                    void act(() => send({ type: "job.confirm", id: job.id }))
                  }
                >
                  Confirm saved {label.toLowerCase()} allowance · $
                  {(job.estimate / 100).toFixed(2)}
                </button>
              </>
            )}
            {job.state === "queued" && (
              <>
                <p>
                  Waiting for the worker. Running this request uses its existing
                  authorized allowance.
                </p>
                {progressJob && own && dispatchable && (
                  <button
                    className="s-btn"
                    disabled={busy || demo || !permission}
                    onClick={() => void act(() => progressJob(job.id))}
                  >
                    {busy
                      ? "Checking existing request…"
                      : `Run saved ${label.toLowerCase()} request`}
                  </button>
                )}
              </>
            )}
            {["queued", "awaiting_confirmation"].includes(job.state) &&
              !dispatchable && (
                <p>
                  This request’s draft, source or access context changed. It
                  cannot run as saved. Cancel undispatched work before
                  requesting a review of the current copy.
                </p>
              )}
            {job.state === "running" && (
              <>
                <p>
                  The provider request is running. Refresh status; do not start
                  another review.
                </p>
                {job.leaseUntil &&
                  Date.parse(job.leaseUntil) < Date.now() &&
                  progressJob &&
                  own && (
                    <button
                      className="s-btn"
                      disabled={busy || demo || !permission}
                      onClick={() => void act(() => progressJob(job.id))}
                    >
                      Check expired request — no automatic retry
                    </button>
                  )}
              </>
            )}
            {["queued", "awaiting_confirmation"].includes(job.state) && (
              <button
                className="s-btn"
                disabled={busy || !permission || (!own && !manage)}
                onClick={() =>
                  void act(() => send({ type: "job.cancel", id: job.id }))
                }
              >
                Cancel undispatched {label.toLowerCase()} request
              </button>
            )}
            {job.state === "unknown" && (
              <>
                <p>
                  This request may have reached the provider. It cannot be
                  cancelled or automatically retried. Check its outcome and cost
                  in the provider dashboard before recording a resolution.
                </p>
                {manage ? (
                  <details>
                    <summary>Record verified provider outcome</summary>
                    <p>
                      This records billing/outcome evidence only. It does not
                      approve content or manufacture a review report.
                    </p>
                    <label className="s-field">
                      Verified outcome
                      <select
                        aria-label="Verified provider outcome"
                        value={outcome}
                        onChange={(e) =>
                          setOutcome(e.target.value as typeof outcome)
                        }
                      >
                        <option value="">
                          Select after checking provider records
                        </option>
                        <option value="succeeded">Succeeded</option>
                        <option value="failed">Failed</option>
                      </select>
                    </label>
                    <label className="s-field">
                      Verified cost (USD)
                      <input
                        aria-label="Verified provider cost"
                        value={amount}
                        inputMode="decimal"
                        placeholder="Actual cost, not the estimate"
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </label>
                    <label className="s-field">
                      Provider evidence
                      <textarea
                        aria-label="Provider outcome evidence"
                        maxLength={200}
                        value={reason}
                        placeholder="Record the request ID and verified outcome/cost. Do not enter API keys."
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                    <button
                      className="s-btn"
                      disabled={
                        busy ||
                        !outcome ||
                        !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
                        !Number.isSafeInteger(
                          Math.round(Number(amount) * 100),
                        ) ||
                        Math.round(Number(amount) * 100) > 100000000 ||
                        reason.trim().length < 10
                      }
                      onClick={() =>
                        void act(() =>
                          send({
                            type: "job.reconcile",
                            id: job.id,
                            outcome: outcome as "succeeded" | "failed",
                            actual: Math.round(Number(amount) * 100),
                            reason: reason.trim(),
                          }),
                        )
                      }
                    >
                      Save verified outcome — no AI call
                    </button>
                  </details>
                ) : (
                  <p>
                    A workspace administrator must record the verified provider
                    outcome.
                  </p>
                )}
              </>
            )}
            {!pending && (
              <p>
                This request is not currently running. Inspect its result and
                any error above; a missing or invalid report still prevents
                final approval.
              </p>
            )}
            {job.result && (
              <details>
                <summary>View this request’s saved response</summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    maxHeight: 300,
                    overflow: "auto",
                  }}
                >
                  {job.result}
                </pre>
              </details>
            )}
          </article>
        );
      })}
    </section>
  );
}
