"use client";
import { useState } from "react";
import {
  BUDGET_CATEGORIES,
  inferBudgetCategory,
  type BudgetCategory,
} from "@/lib/studio/budget-categories";
import type { StudioState } from "@/lib/studio/types";
import type { researchSetupPlan } from "@/lib/studio/research-setup";
type Plan = ReturnType<typeof researchSetupPlan>;
export function ResearchSetup({
  state,
  request,
  disabled,
  demo,
}: {
  state: StudioState;
  request: (body: unknown) => Promise<{ plan: Plan }>;
  disabled: boolean;
  demo: boolean;
}) {
  const connections = state.connections.filter(
    (c) =>
      c.provider === "anthropic" &&
      c.function === "research" &&
      c.hasKey &&
      c.status !== "disconnected",
  );
  const [connectionId, setConnectionId] = useState("");
  const [output, setOutput] = useState(256),
    [packageCap, setPackageCap] = useState(
      Math.min(
        200,
        Math.max(50, state.settings.reviewPolicy?.packageCap || 50),
      ),
    );
  const [category, setCategory] = useState<BudgetCategory>(
    inferBudgetCategory(packageCap),
  );
  const [plan, setPlan] = useState<Plan | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const connection = connections.find((c) => c.id === connectionId);
  const fits = plan?.fitsPackage && plan.fitsRequest && plan.fitsMonthly;
  async function run(action: "check" | "save") {
    if (!connection) return;
    setBusy(true);
    setError("");
    try {
      const result = await request({
        action,
        connectionId,
        outputTokens: output,
        packageCap,
        expectedUpdatedAt: connection.updatedAt,
        expectedVersion: state.version,
        expectedPricingVersion: state.settings.pricingRegistryVersion || 0,
      });
      setPlan(result.plan);
      setSaved(action === "save");
    } catch (e) {
      setPlan(null);
      setError(e instanceof Error ? e.message : "Research setup failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="s-panel s-panel-padding" aria-label="Research setup">
      <h2>Research setup</h2>
      <p>
        Check model search support and calculate the reservation. No manual
        price entry or qualification checkbox. Checking uses the Models API and
        does not run a paid search.
      </p>
      {!connections.length && (
        <p>
          Add a Claude Research connection first using Set up research below.
          Enter provider keys only in Studio.
        </p>
      )}
      <div className="s-form-grid">
        <label className="s-field">
          Research connection
          <select
            aria-label="Research connection"
            value={connectionId}
            disabled={disabled || busy || demo}
            onChange={(e) => {
              setConnectionId(e.target.value);
              setPlan(null);
              setSaved(false);
            }}
          >
            <option value="">Select a stored connection</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {c.model}
              </option>
            ))}
          </select>
        </label>
        <label className="s-field">
          Per-post package category
          <select
            aria-label="Per-post package category"
            value={category}
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value as BudgetCategory;
              setCategory(id);
              if (id !== "custom")
                setPackageCap(
                  BUDGET_CATEGORIES.find((c) => c.id === id)!.cents,
                );
              setPlan(null);
              setSaved(false);
            }}
          >
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {c.id !== "custom"
                  ? ` — $${(c.cents / 100).toFixed(2)} cap`
                  : " — up to $2.00"}
              </option>
            ))}
          </select>
        </label>
        {category === "custom" && (
          <label className="s-field">
            Custom per-post cap ($)
            <input
              aria-label="Custom per-post cap ($)"
              type="number"
              min="0.50"
              max="2"
              step="0.01"
              value={(packageCap / 100).toFixed(2)}
              disabled={busy}
              onChange={(e) => {
                setPackageCap(Math.round(Number(e.target.value) * 100));
                setPlan(null);
                setSaved(false);
              }}
            />
          </label>
        )}

        <label className="s-field">
          Research response size
          <select
            aria-label="Research response size"
            value={output}
            disabled={busy}
            onChange={(e) => {
              setOutput(Number(e.target.value));
              setPlan(null);
              setSaved(false);
            }}
          >
            <option value={128}>Brief — 128 output tokens</option>
            <option value={256}>Short — 256 output tokens</option>
            <option value={512}>Standard — 512 output tokens</option>
            <option value={1024}>Longer — 1,024 output tokens</option>
          </select>
        </label>
      </div>
      <p>
        Package cap covers the whole post: research, writing, revisions and
        review. Monthly budget is founder-selected: $
        {(state.settings.monthlyCap / 100).toFixed(2)}. Change budgets
        separately in Review and preparation; this setup never raises them.
        Saving records the calculated rate and connection allowance; it never
        starts a paid search.
      </p>
      <button
        className="s-btn"
        disabled={disabled || demo || busy || !connection}
        onClick={() => void run("check")}
      >
        {busy ? "Checking…" : "Check capability & calculate"}
      </button>
      {plan && (
        <div className="s-version" role="status">
          <h3>Web search supported · {plan.model}</h3>
          <p>
            Model input limit: {plan.contextTokens.toLocaleString()} tokens.
            Request output limit: {plan.outputTokens.toLocaleString()} tokens.
            One search.
          </p>
          <p>
            <strong>
              Calculated guarded reservation: ${(plan.cents / 100).toFixed(2)}
            </strong>
          </p>
          <p>{plan.explanation}</p>
          <p>
            Documented prices as of {plan.price.verifiedAt}: $2 / million input
            tokens, $10 / million output tokens, $0.01 / search.{" "}
            <a
              href={plan.price.tokenSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              Token pricing source
            </a>{" "}
            ·{" "}
            <a
              href={plan.price.searchSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              Search pricing source
            </a>
          </p>
          {!fits && (
            <p role="alert">
              This cannot fit the selected package or current workspace limits.
              Basic server search does not expose a tight retrieved-token cap. A
              cheaper expected bill is not a verified maximum. No setup or
              budget was changed, and no paid search was started.
            </p>
          )}
          {fits && state.settings.reviewPolicy?.packageCap !== packageCap && (
            <p>
              Save this package cap in Review and preparation before saving
              research setup.
            </p>
          )}
          <button
            className="s-btn"
            disabled={
              disabled ||
              busy ||
              !fits ||
              state.settings.reviewPolicy?.packageCap !== packageCap ||
              saved
            }
            onClick={() => void run("save")}
          >
            {saved ? "Research setup saved" : "Save calculated research setup"}
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {demo && (
        <p>
          Use live Studio to inspect your account model. Demo never checks
          credentials or runs search.
        </p>
      )}
    </section>
  );
}
