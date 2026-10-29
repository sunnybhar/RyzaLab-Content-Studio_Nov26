"use client";

import { useState, type FormEvent } from "react";
import { can } from "@/lib/studio/permissions";
import type { Actor, Command, StudioState } from "@/lib/studio/types";

/** Keep adoption disabled until both two-step review screens and automation are ready. */
export function SoloPolicySettings({
  state,
  actor,
  send,
  ready = false,
}: {
  state: StudioState;
  actor: Actor;
  send: (command: Command) => Promise<unknown>;
  ready?: boolean;
}) {
  const policy = state.settings.reviewPolicy;
  const founder = can(state, actor, "policy.manage");
  const [editing, setEditing] = useState(false);
  const [packageCap, setPackageCap] = useState(
    ((policy?.packageCap ?? 50) / 100).toFixed(2),
  );
  const [monthlyCap, setMonthlyCap] = useState(
    ((policy ? state.settings.monthlyCap : 500) / 100).toFixed(2),
  );
  const [independent, setIndependent] = useState(
    policy?.requireIndependentReview ?? false,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeJobs = state.jobs.some((job) =>
    ["awaiting_confirmation", "queued", "running", "unknown"].includes(
      job.state,
    ),
  );

  function cents(value: string) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return Number.isSafeInteger(amount) && amount > 0 && amount <= 100000000
      ? amount
      : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !founder || activeJobs || pending) return;
    const perPackage = cents(packageCap);
    const perMonth = cents(monthlyCap);
    if (!perPackage || !perMonth) {
      setError(
        "Enter positive dollar amounts with no more than two decimal places.",
      );
      return;
    }
    setError("");
    setPending(true);
    try {
      await send({
        type: "policy.adoptSolo",
        packageCap: perPackage,
        monthlyCap: perMonth,
        requireIndependentReview: independent,
        autoDraft: policy?.autoDraft ?? true,
        autoReview: policy?.autoReview ?? true,
        expectedRuleVersion: state.settings.protectedVersion,
      });
      setEditing(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Settings could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="s-panel">
      <div className="s-section-heading">
        <div>
          <h2>Review and preparation</h2>
          <p>
            Approve the copy first, then review and approve the complete
            package.
          </p>
        </div>
        {founder && ready && !editing && (
          <button
            className="s-btn"
            onClick={() => {
              setPackageCap(((policy?.packageCap ?? 50) / 100).toFixed(2));
              setMonthlyCap(
                ((policy ? state.settings.monthlyCap : 500) / 100).toFixed(2),
              );
              setIndependent(policy?.requireIndependentReview ?? false);
              setEditing(true);
            }}
          >
            {policy ? "Edit settings" : "Set up two-step review"}
          </button>
        )}
      </div>
      {policy ? (
        <p>
          Two-step review enabled · ${(policy.packageCap / 100).toFixed(2)} per
          package · $ {(state.settings.monthlyCap / 100).toFixed(2)} monthly
          {policy.requireIndependentReview
            ? " · Independent AI review required"
            : ""}
          <br />
          Set by {policy.adoptedBy} on{" "}
          {new Date(policy.adoptedAt).toLocaleString()}.
        </p>
      ) : (
        <p>
          The current review process remains active until a founder enables
          two-step review.
        </p>
      )}
      {!ready && (
        <p>
          Two-step review setup will be available when the new review and
          preparation flow is ready.
        </p>
      )}
      {ready && !founder && (
        <p>Only a founder can change review and preparation settings.</p>
      )}
      {editing && founder && ready && (
        <form onSubmit={submit}>
          <p>
            Routine preparation is limited to the allowance you set for each
            package and your monthly budget. A person approves the copy and the
            final package and publishes it. Provider setup and qualified pricing
            are still required.
          </p>
          <div className="s-form-grid">
            <label className="s-field">
              Maximum per package ($)
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                value={packageCap}
                onChange={(event) => setPackageCap(event.target.value)}
              />
            </label>
            <label className="s-field">
              Monthly limit ($)
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                value={monthlyCap}
                onChange={(event) => setMonthlyCap(event.target.value)}
              />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={independent}
              onChange={(event) => setIndependent(event.target.checked)}
            />{" "}
            Require an independent AI review for ordinary content
          </label>
          <p>
            Notes still require a founder’s authorization and an independent
            review.
          </p>
          <details>
            <summary>Current protected brand rules</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {state.settings.protectedRules}
            </p>
          </details>
          {activeJobs && (
            <p role="status">
              Wait for active or uncertain requests to be resolved before
              changing this policy.
            </p>
          )}
          {error && (
            <div className="s-alert s-error" role="alert">
              {error}
            </div>
          )}
          <div className="s-card-actions">
            <button
              type="submit"
              className="s-btn s-primary"
              disabled={pending || activeJobs}
            >
              {pending ? "Saving…" : "Save review settings"}
            </button>
            <button
              type="button"
              className="s-btn"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
