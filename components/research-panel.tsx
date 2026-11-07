"use client";
import { useEffect, useRef, useState } from "react";
import type {
  Actor,
  Channel,
  Command,
  Content,
  StudioState,
} from "@/lib/studio/types";
import {eligibleEvidence,excludedResearchUrl} from "@/lib/studio/source-policy";
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
  const [sourceLinks,setSourceLinks]=useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ query: string; links:string; key: string } | null>(null);
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
        <p>Find relevant web/news sources, accessible article passages and scholarly abstracts. Wikipedia is excluded from new research. Each source identifies whether article text or only a search excerpt was available; coverage varies. Public retrieval does not require a separate Research key.</p>
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
        <label className="s-field">Optional public source links (one per line, up to 10)<textarea aria-label="Research source links" value={sourceLinks} maxLength={20000} rows={3} disabled={disabled||busy} onChange={e=>setSourceLinks(e.target.value)} placeholder="https://example.org/article"/></label>
        <p>
          Only this question is sent to public search. Keep private details,
          secrets and personal stories out of it. Supplied links are read directly within source, byte and deadline bounds. Private instructions stay out of public queries. No automatic retry.
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
            if (!pending.current || pending.current.query !== query || pending.current.links !== sourceLinks)
              pending.current = { query, links:sourceLinks, key: crypto.randomUUID() };
            setBusy(true);
            try {
              const ok = await run(
                {
                  type: "research.retrieve",
                  channel,
                  contentId: content?.id,
                  expectedRevision: content?.revision,
                  query: query.trim(),
                  sourceUrls:[...new Set(sourceLinks.split(/\s+/).map(url=>url.trim()).filter(Boolean))],
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
          let originalEvidence;
          try {
            originalEvidence = researchEvidence(state, actor, channel, [job.id])[0];
            evidence=eligibleEvidence([originalEvidence])[0];
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
              {originalEvidence&&originalEvidence.citations.some(c=>excludedResearchUrl(c.url))&&<details><summary>Excluded historical sources — not used in new AI work</summary><p>The original record remains saved.</p>{originalEvidence.citations.filter(c=>excludedResearchUrl(c.url)).map((cite,i)=><article key={i}><p>{cite.title} · {cite.url}</p><p>{cite.citedText}</p></article>)}</details>}
              {!evidence&&selected.includes(job.id)&&<button className="s-btn" disabled={disabled||busy} onClick={()=>onSelected(selected.filter(id=>id!==job.id))}>Remove excluded selection</button>}
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
                        {cite.publishedAt&&<p>Published {cite.publishedAt}</p>}
                        {cite.accessNote && <p>{cite.accessNote}</p>}
                        {cite.author && <p>By {cite.author}</p>}
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
