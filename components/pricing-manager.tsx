"use client";
import { useRef, useState } from "react";
import type { Rate } from "@/lib/studio/pricing";
const fieldStyle = { display: "grid", gap: 6 };
export function PricingManager({
  request,
  demo,
  disabled,
  changed,
}: {
  request: (body?: unknown) => Promise<{ rates?: Rate[]; version?: number }>;
  demo: boolean;
  disabled: boolean;
  changed: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Rate | undefined>();
  const [key, setKey] = useState(0);
  async function load() {
    const result = await request();
    setRates(result.rates || []);
    setVersion(result.version || 0);
    setLoaded(true);
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load rates.",
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(rate?: Rate) {
    setEditing(rate);
    setKey((v) => v + 1);
    setError("");
    dialog.current?.showModal();
  }
  return (
    <section className="s-panel">
      <div className="s-section-heading">
        <div>
          <h2>Verified pricing</h2>
          <p>
            Manage conservative USD prices for writing, ideas and review. Budget
            limits remain separate.
          </p>
        </div>
        <div className="s-actions">
          <button
            className="s-btn"
            disabled={disabled || demo || busy}
            onClick={() => void refresh()}
          >
            {loaded ? "Refresh pricing" : "Load pricing"}
          </button>
          <button
            className="s-btn"
            disabled={disabled || demo || busy || !loaded}
            onClick={() => edit()}
          >
            Add pricing
          </button>
        </div>
      </div>
      {demo && (
        <p>
          Pricing changes require a live workspace. Demo mode never qualifies
          paid execution.
        </p>
      )}
      {error && (
        <p role="alert" className="s-alert s-error">
          {error}
        </p>
      )}
      {loaded && !rates.length && (
        <p>
          No verified prices registered. Paid generation remains blocked until
          the selected model and function have a qualified entry.
        </p>
      )}
      {rates.map((rate) => (
        <div
          className="s-list-row"
          key={`${rate.provider}/${rate.model}/${rate.function}`}
        >
          <div>
            <strong>
              {rate.provider} · {rate.model} · {rate.function}
            </strong>
            <p>
              Input ${(rate.inputCentsPerMillion / 100).toFixed(2)} / million
              tokens · Output ${(rate.outputCentsPerMillion / 100).toFixed(2)} /
              million tokens
              {rate.fixedCents
                ? ` · Fixed reservation $${(rate.fixedCents / 100).toFixed(2)}`
                : ""}
            </p>
            <p>
              Verified {rate.verifiedAt} ·{" "}
              {rate.qualifiedBy || "Server configuration"}
            </p>
            <p style={{ overflowWrap: "anywhere" }}>Source: {rate.source}</p>
          </div>
          <div className="s-actions">
            <button
              className="s-btn"
              disabled={
                busy ||
                disabled ||
                !["text", "ideas", "review"].includes(rate.function)
              }
              onClick={() => edit(rate)}
            >
              Edit pricing
            </button>
            <button
              className="s-btn"
              disabled={busy || disabled}
              onClick={async () => {
                if (
                  !window.confirm(
                    `Remove pricing for ${rate.model} / ${rate.function}? Pending requests using it will be blocked before dispatch.`,
                  )
                )
                  return;
                setBusy(true);
                setError("");
                try {
                  await request({
                    action: "remove",
                    expectedVersion: version,
                    provider: rate.provider,
                    model: rate.model,
                    function: rate.function,
                  });
                  await load();
                  await changed();
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not remove pricing.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove pricing
            </button>
          </div>
        </div>
      ))}
      <dialog
        ref={dialog}
        className="s-review-dialog"
        aria-label="Verified pricing editor"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header className="s-review-dialog-heading">
          <h2>{editing ? "Edit pricing" : "Add pricing"}</h2>
          <button
            className="s-btn"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </header>
        <form
          key={key}
          className="s-review-dialog-body"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const n = (name: string) => Number(data.get(name));
            const text = (name: string) => String(data.get(name) || "");
            setBusy(true);
            setError("");
            try {
              await request({
                action: "save",
                expectedVersion: version,
                evidence: text("evidence"),
                card: {
                  provider: editing?.provider || text("provider"),
                  model: editing?.model || text("model"),
                  function: editing?.function || text("function"),
                  currency: "USD",
                  inputCentsPerMillion: n("input") * 100,
                  outputCentsPerMillion: n("output") * 100,
                  maxInputBytes: n("bytes"),
                  maxOutputTokens: n("tokens"),
                  ...(text("fixed")
                    ? { fixedCents: Math.round(n("fixed") * 100) }
                    : {}),
                  source: text("source"),
                  verifiedAt: text("date"),
                  qualified: true,
                },
              });
              await load();
              await changed();
              dialog.current?.close();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not save pricing.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Verify current provider pricing and adapter limits yourself. This
            records your qualification; it does not run a paid test or verify a
            price automatically.
          </p>
          <fieldset
            disabled={busy}
            style={{ border: 0, padding: 0, display: "grid", gap: 16 }}
          >
            <label style={fieldStyle}>
              Provider
              <select
                name="provider"
                disabled={!!editing}
                defaultValue={editing?.provider || "anthropic"}
                required
              >
                {[
                  ["anthropic", "Claude (Anthropic)"],
                  ["openai", "OpenAI"],
                  ["google", "Gemini (Google)"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label style={fieldStyle}>
              Exact model identifier
              <input
                name="model"
                readOnly={!!editing}
                required
                maxLength={150}
                defaultValue={editing?.model}
              />
            </label>
            <label style={fieldStyle}>
              Function
              <select
                name="function"
                disabled={!!editing}
                defaultValue={editing?.function || "text"}
              >
                {["text", "ideas", "review"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label style={fieldStyle}>
              Input price (USD per million tokens)
              <input
                name="input"
                type="number"
                required
                min="0"
                step="0.000001"
                defaultValue={
                  editing ? editing.inputCentsPerMillion / 100 : undefined
                }
              />
            </label>
            <label style={fieldStyle}>
              Output price (USD per million tokens)
              <input
                name="output"
                type="number"
                required
                min="0"
                step="0.000001"
                defaultValue={
                  editing ? editing.outputCentsPerMillion / 100 : undefined
                }
              />
            </label>
            <label style={fieldStyle}>
              Maximum input bytes
              <input
                name="bytes"
                type="number"
                required
                min="1"
                max="500000"
                defaultValue={editing?.maxInputBytes || 50000}
              />
            </label>
            <label style={fieldStyle}>
              Maximum output tokens
              <input
                name="tokens"
                type="number"
                required
                min="1"
                max="6000"
                defaultValue={editing?.maxOutputTokens || 3000}
              />
            </label>
            <label style={fieldStyle}>
              Fixed conservative reservation (USD, optional)
              <input
                name="fixed"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  editing?.fixedCents ? editing.fixedCents / 100 : undefined
                }
              />
            </label>
            <label style={fieldStyle}>
              Pricing source (HTTPS URL)
              <input
                name="source"
                type="url"
                required
                defaultValue={editing?.source}
              />
            </label>
            <label style={fieldStyle}>
              Date verified
              <input
                name="date"
                type="date"
                required
                defaultValue={editing?.verifiedAt.slice(0, 10)}
              />
            </label>
            <label style={fieldStyle}>
              Evidence of price and adapter qualification
              <textarea
                name="evidence"
                required
                minLength={10}
                maxLength={12000}
                defaultValue={editing?.qualificationEvidence}
              />
            </label>
            <label>
              <input type="checkbox" required /> I checked the price, supported
              function and conservative input/output limits. Existing budget
              caps still apply.
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="s-alert s-error">
              {error}
            </p>
          )}
          <button className="s-btn s-primary" disabled={busy}>
            Save verified pricing
          </button>
        </form>
      </dialog>
    </section>
  );
}
