"use client";

import { useState, type FormEvent } from "react";
import { BUDGET_CATEGORIES,inferBudgetCategory,type BudgetCategory } from "@/lib/studio/budget-categories";
import { can } from "@/lib/studio/permissions";
import type { Actor, Command, StudioState } from "@/lib/studio/types";

/** Founder explicitly adopts the two-step policy; no settings change on load. */
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
  const [editVersion, setEditVersion] = useState<string | undefined>();
  const [editRules, setEditRules] = useState("");
  const [editMonthlyCap, setEditMonthlyCap] = useState(0);
  const [packageCap, setPackageCap] = useState(
    ((policy?.packageCap ?? 50) / 100).toFixed(2),
  );
  const [budgetCategory,setBudgetCategory] = useState<BudgetCategory>(policy?.budgetCategory||inferBudgetCategory(policy?.packageCap||50));
  const [independent, setIndependent] = useState(
    policy?.requireIndependentReview ?? false,
  );
  const [automaticWriting, setAutomaticWriting] = useState(
    policy?.autoDraft ?? true,
  );
  const [automaticReview, setAutomaticReview] = useState(
    policy?.autoReview ?? true,
  );
  const [automaticCorrection,setAutomaticCorrection]=useState(policy?.autoCorrect??false);
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
    if (!perPackage || perPackage > 200) {
      setError(
        "Choose a package cap up to $2.00, with at most two decimals.",
      );
      return;
    }
    if (!editMonthlyCap) {
      setError("Set your monthly AI budget in Spending before enabling automated preparation.");
      return;
    }
    setError("");
    setPending(true);
    try {
      await send({
        type: "policy.adoptSolo",
        expectedPolicyVersion: editVersion,
        expectedMonthlyCap: editMonthlyCap,
        packageCap: perPackage,
        budgetCategory,
        monthlyCap: editMonthlyCap,
        requireIndependentReview: independent,
        autoDraft: automaticWriting,
        autoReview: automaticReview,
        autoCorrect: automaticCorrection,
        expectedRuleVersion: editRules,
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
            Writer submits; AI prepares and checks; founder reviews the final content and approves.
          </p>
        </div>
        {founder && ready && !editing && (
          <button
            className="s-btn"
            onClick={() => {
              setPackageCap(((policy?.packageCap ?? 50) / 100).toFixed(2));
              setBudgetCategory(policy?.budgetCategory||inferBudgetCategory(policy?.packageCap||50));
              setIndependent(policy?.requireIndependentReview ?? false);
              setAutomaticReview(policy?.autoReview ?? true);
              setAutomaticCorrection(policy?.autoCorrect??false);
              setAutomaticWriting(policy?.autoDraft ?? true);
              setEditVersion(policy?.version);
              setEditRules(state.settings.protectedVersion);
              setEditMonthlyCap(state.settings.monthlyCap);
              setEditing(true);
            }}
          >
            {policy ? "Edit settings" : "Set up two-step review"}
          </button>
        )}
      </div>
      {policy ? (
        <p>
          Two-step review enabled · {policy.budgetCategory ? `${BUDGET_CATEGORIES.find(category=>category.id===policy.budgetCategory)?.label} · ` : ""}${(policy.packageCap / 100).toFixed(2)} per
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
          <p>Plan $0.50–$2.00 per post. This is a ceiling for the whole package, not a fixed price or a quality tier. Set your monthly AI budget in Spending.</p>
          <label className="s-field">Package category<select aria-label="Package category" value={budgetCategory} onChange={event=>{const selected=event.target.value as BudgetCategory;setBudgetCategory(selected);if(selected!=="custom")setPackageCap((BUDGET_CATEGORIES.find(category=>category.id===selected)!.cents/100).toFixed(2));}}>{BUDGET_CATEGORIES.map(category=><option key={category.id} value={category.id}>{category.label}{category.id!=="custom" ? ` — $${(category.cents/100).toFixed(2)} cap` : " — choose up to $2.00"}</option>)}</select></label><p>{BUDGET_CATEGORIES.find(category=>category.id===budgetCategory)?.description}</p>

          <div className="s-form-grid">
            <label className="s-field">
              Maximum per package ($)
              <input
                type="number"
                min="0.50"
                max="2"
                step="0.01"
                required
                value={packageCap}
                onChange={(event) => {setPackageCap(event.target.value);setBudgetCategory("custom");}}
              />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={automaticWriting}
              onChange={(event) => setAutomaticWriting(event.target.checked)}
            />{" "}
            Write the first draft automatically when I select an idea
          </label>
          <p>
            Only newly selected ideas start automatic writing, within an
            authorized package allowance. Existing drafts stay unchanged. Image,
            audio and video generation remain separate.
          </p>
          <label>
            <input
              type="checkbox"
              checked={automaticReview}
              onChange={(event) => setAutomaticReview(event.target.checked)}
            />{" "}
            Prepare an AI textual review automatically after submission
          </label>
          <label><input type="checkbox" checked={automaticCorrection} disabled={!automaticReview} onChange={event=>setAutomaticCorrection(event.target.checked)}/> Automatically correct review findings and recheck (maximum two rounds, within the package allowance)</label>
          <p>Existing settings keep automatic corrections off until the founder enables them. Missing facts, uncertain outcomes, changed drafts or insufficient budget stop the loop; final approval stays with the founder.</p>
          <p>
            Automatic review requires a validated review connection, verified
            pricing, a running worker and a package allowance. Missing setup or
            budget blocks final approval until resolved. This does not inspect
            images or publish content.
          </p>
          <label>
            <input
              type="checkbox"
              checked={independent}
              onChange={(event) => setIndependent(event.target.checked)}
            />{" "}
            Require an independent AI review for ordinary content
          </label>
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
