"use client";
import { useEffect, useRef, useState } from "react";
import type {
  Actor,
  Channel,
  Command,
  Content,
  StudioState,
} from "@/lib/studio/types";
import { researchEvidence } from "@/lib/studio/research-link";


export function ResearchPanel({
  state,
  actor,
  channel,
  content,
  selected,
  onSelected,
  run,
  refresh,
  disabled = false,
  demo = false,
}: {
  state: StudioState;
  actor: Actor;
  channel: Channel;
  content?: Content;
  selected: string[];
  onSelected: (ids: string[]) => void;
  run: (command: Command, message?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  disabled?: boolean;
  demo?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ query: string; key: string } | null>(null);
  const jobs = state.jobs.filter(
    (j) =>
      j.kind === "research" &&
      j.channel === channel &&
      j.createdBy === actor.email &&
      (!j.contentId || j.contentId === content?.id),
  );
  const active = jobs.find((j) =>
    ["queued", "running", "awaiting_confirmation", "unknown"].includes(j.state),
  );
  useEffect(() => {
    if (demo || !active || !["queued", "running"].includes(active.state))
      return;
    const timer = setInterval(() => void refresh().catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [demo, active?.id, active?.state, refresh]);
  return (
    <section className="s-panel s-panel-padding" aria-label="Web research">
      <h3>Web research</h3>
      <p>
        Research public facts, review the cited sources, then select evidence
        for {content ? "this draft" : "your ideas"}. Search does not confirm
        personal experiences.
      </p>
      <details>
        <summary>Find public references</summary>
        <p>Retrieve Wikipedia introductory extracts and Crossref scholarly abstracts. Two public API requests, at most six excerpts and 12 KB of excerpt text. This is limited reference coverage, not unrestricted web or news search. No separate Research key or paid search charge is required.</p>
        <label className="s-field">
          Public research question
          <textarea
            aria-label="Public research question"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled || busy}
            maxLength={2000}
            placeholder="For example: what should a household handoff checklist contain?"
          />
        </label>
        <p>
          Only this question is sent to public search. Keep private details,
          secrets and personal stories out of it. Two bounded source requests; no
          automatic retry.
        </p>
        <button
          className="s-btn"
          disabled={
            demo ||
            disabled ||
            busy ||
            Boolean(active) ||
            query.trim().length < 5
          }
          onClick={async () => {
            if (!pending.current || pending.current.query !== query)
              pending.current = { query, key: crypto.randomUUID() };
            setBusy(true);
            try {
              const ok = await run(
                {
                  type: "research.retrieve",
                  channel,
                  contentId: content?.id,
                  expectedRevision: content?.revision,
                  query: query.trim(),
                  idempotencyKey: pending.current.key,
                },
                "Public references retrieved — inspect the excerpts before use",
              );
              if (ok) pending.current = null;
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Requesting…" : "Find references"}
        </button>
        {demo && <p>Preview does not call search providers.</p>}
      </details>
      {active && (
        <div role="status">
          <p>
            {active.state === "running"
              ? "Research is running."
              : active.state === "queued"
                ? "Research is waiting to start."
                : active.state === "unknown"
                  ? "Research outcome is uncertain. Reconcile it before another paid request."
                  : "Research needs budget confirmation."}
          </p>
          {active.state === "awaiting_confirmation" && (
            <button
              className="s-btn"
              disabled={disabled || busy}
              onClick={() =>
                void run(
                  { type: "job.confirm", id: active.id },
                  "Research budget confirmed",
                )
              }
            >
              Confirm research allowance
            </button>
          )}
        </div>
      )}
      {!jobs.length && (
        <p>
          No web research yet. Writing without selected research uses saved
          references only.
        </p>
      )}
      {jobs
        .filter((j) => !active || j.id !== active.id)
        .slice(0, 10)
        .map((job) => {
          let evidence;
          try {
            evidence = researchEvidence(state, actor, channel, [job.id])[0];
          } catch {}
          return (
            <div key={job.id} className="s-version">
              <strong>{job.prompt.slice(0, 160)}</strong>
              <p>
                {new Date(job.createdAt).toLocaleString()} ·{" "}
                {evidence
                  ? "Cited evidence available — review sources"
                  : job.state === "succeeded"
                    ? "Needs source review; cannot use as evidence"
                    : job.state}{" "}
                · ${(job.estimate / 100).toFixed(2)} estimated
              </p>
              {evidence ? (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(job.id)}
                      disabled={
                        disabled ||
                        busy ||
                        (!selected.includes(job.id) && selected.length >= 5)
                      }
                      onChange={(e) =>
                        onSelected(
                          e.target.checked
                            ? [...selected, job.id]
                            : selected.filter((id) => id !== job.id),
                        )
                      }
                    />{" "}
                    Use this evidence in{" "}
                    {content ? "writing" : "idea generation"}
                  </label>
                  <details>
                    <summary>
                      Findings and {evidence.citations.length} cited sources
                    </summary>
                    <p style={{ whiteSpace: "pre-wrap" }}>{evidence.summary}</p>
                    {evidence.retrievedAt && (
                      <p>
                        Retrieved{" "}
                        {new Date(evidence.retrievedAt).toLocaleString()}
                      </p>
                    )}
                    {evidence.citations.map((cite, i) => (
                      <article key={i}>
                        <a
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {cite.title || cite.url}
                        </a>
                        <p>{cite.citedText}</p>
                      </article>
                    ))}
                    {evidence.claims?.length ? (
                      <details>
                        <summary>Finding-to-source links</summary>
                        {evidence.claims.map((claim, i) => (
                          <div key={i}>
                            <p>{claim.text}</p>
                            {claim.sourceUrls.map((url) => (
                              <p key={url}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {url}
                                </a>
                              </p>
                            ))}
                          </div>
                        ))}
                      </details>
                    ) : null}
                    <p>{evidence.notice}</p>
                    {evidence.version===2 && evidence.retrieval.gaps.map(gap=><p key={gap} role="status">{gap}</p>)}
                  </details>
                </>
              ) : (
                job.error && <p>{job.error}</p>
              )}
            </div>
          );
        })}
      {selected.length > 0 && (
        <p>
          {selected.length} research result(s) selected. Model answers remain
          subject to source checks and human approval.
        </p>
      )}
    </section>
  );
}
