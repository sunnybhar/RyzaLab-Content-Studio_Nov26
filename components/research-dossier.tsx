"use client";
import { useRef, useState } from "react";
import type { Actor, Channel, Command, StudioState } from "@/lib/studio/types";
import { researchAnalysisInput } from "@/lib/studio/research-analysis";
import { quote } from "@/lib/studio/pricing";
import type { ResearchDossier } from "@/lib/studio/research-dossier";
export function DossierDetails({ dossier }: { dossier: ResearchDossier }) {
  const source = (id: string) => dossier.sources.find((s) => s.id === id);
  return (
    <details className="s-version">
      <summary>
        Research dossier · {dossier.claims.length} claims ·{" "}
        {dossier.calculationResults.length} calculations
      </summary>
      <h4>{dossier.question}</h4>
      <p>{dossier.notice}</p>
      {!!dossier.assumptions.length && (
        <>
          <h4>Assumptions</h4>
          <ul>
            {dossier.assumptions.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </>
      )}
      {!!dossier.findings.length && <><h4>Findings</h4><ul>{dossier.findings.map((v,i)=><li key={i}>{v}</li>)}</ul></>}
      <h4>Claim ledger</h4>
      {dossier.claims.map((c) => (
        <article className="s-version" key={c.id}>
          <strong>
            {c.id} · {c.status.replaceAll("_", " ")}
          </strong>
          <p>{c.text}</p>
          <p>{c.reasoning}</p>
          <p>
            {c.applicableDate} · {c.geography}
          </p>
          {c.evidence.map((e, i) => (
            <blockquote key={i}>
              <p>{e.quote}</p>
              <a
                href={source(e.sourceId)?.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {e.sourceId} · {source(e.sourceId)?.title}
              </a>
            </blockquote>
          ))}
          {c.limitations && <p>Limits: {c.limitations}</p>}
        </article>
      ))}
      <h4>Data and reproducible calculations</h4>
      {!dossier.data.length && (
        <p>
          No suitable numeric inputs were identified. No statistics were added
          to fill the gap.
        </p>
      )}
      {dossier.data.map((d) => (
        <details key={d.id}>
          <summary>
            {d.id} · {d.label}: {d.literal} {d.unit} · {d.period}
          </summary>
          <p>
            {d.kind.replaceAll("_", " ")} · {d.geography}
          </p>
          <blockquote>{d.quote}</blockquote>
          <p>{d.limitations}</p>
          <a
            href={source(d.sourceId)?.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Original source
          </a>
        </details>
      ))}
      {dossier.calculationResults.map((r) => {
        const calculation = dossier.calculations.find((c) => c.id === r.id)!;
        return (
          <article key={r.id} className="s-version">
            <strong>
              {calculation.label}:{" "}
              {r.value.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
              {r.unit}
            </strong>
            <p>{r.formula}</p>
            <p>Inputs: {calculation.inputIds.join(", ")}</p>
            <p>{calculation.comparisonBasis}</p>
            <p>{calculation.interpretation}</p>
            <p>{calculation.limitations}</p>
          </article>
        );
      })}
      {[
        ["Counterarguments", dossier.counterarguments],
        ["Evidence gaps", dossier.gaps],
        ["Analysis self-critique", dossier.critique],
      ].map(([label, items]) => (
        <section key={String(label)}>
          <h4>{String(label)}</h4>
          <ul>
            {(items as string[]).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </section>
      ))}
      {!!dossier.angles.length && (
        <>
          <h4>Evidence-led angles</h4>
          {dossier.angles.map((a, i) => (
            <p key={i}>
              <strong>{a.title}</strong> · {a.claimIds.join(", ")} —{" "}
              {a.whyUseful}
            </p>
          ))}
        </>
      )}
      <h4>Source access and provenance</h4>
      {dossier.sources.map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.id} · {s.title}</a> · {s.sourceKind || "Unspecified excerpt"} · {s.publishedAt || "Publication date unknown"}{s.author ? ` · ${s.author}` : ""}{s.accessNote ? ` · ${s.accessNote}` : ""}</p>)}
      <p>Analyzed {dossier.analysedAt}. Distinct URLs do not establish independent origins.</p>
      <button
        className="s-btn"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(dossier, null, 2)], {
              type: "application/json",
            }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = "research-dossier.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Download dossier and calculation inputs
      </button>
    </details>
  );
}
export function ResearchAnalysis({
  state,
  actor,
  channel,
  researchJobId,
  run,
  refresh,
  disabled = false,
  demo = false,
}: {
  state: StudioState;
  actor: Actor;
  channel: Channel;
  researchJobId: string;
  run: (command: Command, message?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  disabled?: boolean;
  demo?: boolean;
}) {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const analyses = state.jobs.filter(
    (j) =>
      j.createdBy === actor.email &&
      j.researchAnalysisSourceId === researchJobId,
  );
  const active = analyses.find((j) =>
    ["queued", "running", "unknown", "awaiting_confirmation"].includes(j.state),
  );
  const source = state.jobs.find((j) => j.id === researchJobId);
  const ready = analyses.find(
    (j) =>
      j.state === "succeeded" &&
      j.outputStatus === "ready" &&
      j.researchDossier &&
      j.researchSnapshots?.some(
        (snapshot) =>
          snapshot.jobId === researchJobId && snapshot.raw === source?.result,
      ),
  );
  let maximum = 0,
    setup = "";
  if (!ready && !active) {
    try {
      const candidate = researchAnalysisInput(state, actor, {
        channel,
        researchJobId,
        idempotencyKey: "analysis-quote-preview",
        maximum: 200,
      });
      maximum = quote(state, candidate).cost;
    } catch (e) {
      setup =
        e instanceof Error
          ? e.message
          : "Configure Writing to analyze evidence.";
    }
  }
  return (
    <section aria-label="Research analysis" className="s-version">
      <h4>Analyze evidence for ideas and writing</h4>
      <p>
        Build a claim ledger, compare contrary evidence and calculate only from
        quoted numbers. Uses the configured Writing model. It does not create a
        post or independently verify facts.
      </p>
      {ready?.researchDossier ? (
        <>
          <p role="status">
            Dossier ready. Selecting this research also supplies its eligible
            ledger and calculations to ideas and writing.
          </p>
          <DossierDetails dossier={ready.researchDossier} />
        </>
      ) : active ? (
        <>
          <p role="status">
            Analysis {active.state.replaceAll("_", " ")}.{" "}
            {active.state === "unknown"
              ? "Outcome is uncertain; its reservation is retained. No automatic paid retry."
              : "Your saved sources remain available."}
          </p>
          {active.state === "awaiting_confirmation" && <button className="s-btn" disabled={busy || disabled} onClick={async()=>{
            setBusy(true);try{await run({type:"job.confirm",id:active.id},"Analysis allowance confirmed");}finally{setBusy(false);}
          }}>Confirm saved analysis allowance</button>}
          <button
            className="s-btn"
            disabled={busy || disabled}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                if (!demo) {
                  const response = await fetch("/api/studio/jobs/progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId: active.id }),
                  });
                  if (!response.ok) {
                    const result = await response.json();
                    throw Error(
                      result.error || "Check the saved analysis request.",
                    );
                  }
                }
                await refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Status unavailable.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Check analysis status — no new request
          </button>
        </>
      ) : (
        <>
          {analyses[0]?.error && (
            <p role="status">Previous analysis: {analyses[0].error}</p>
          )}
          {setup ? (
            <p role="status">{setup}</p>
          ) : (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={disabled || busy || demo}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                Authorize one analysis up to ${(maximum / 100).toFixed(2)}.
                Existing request and monthly limits apply.
              </label>
              <button
                className="s-btn"
                disabled={disabled || busy || demo || !consent || !maximum}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  key.current ??= crypto.randomUUID();
                  try {
                    const ok = await run(
                      {
                        type: "research.analyze",
                        channel,
                        researchJobId,
                        maximum,
                        idempotencyKey: key.current,
                      },
                      "Research analysis queued; sources remain saved",
                    );
                    if (ok) {
                      key.current = null;
                      setConsent(false);
                    }
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Analysis could not start.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving request…" : "Analyze sources and build dossier"}
              </button>
            </>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
