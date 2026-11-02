"use client";
import { JobCost, PostCost } from "./job-cost";
import { useEffect, useRef, useState } from "react";
import type { Actor, StudioState } from "@/lib/studio/types";
import { verificationPreflight } from "@/lib/studio/verification-pack";
import { copyBlockers, currentCopyAcceptance } from "@/lib/studio/solo-quality";
import { researchEvidence } from "@/lib/studio/research-link";
export function VerificationPack({
  state,
  actor,
  request,
  refresh,
  openDraft,
  disabled,
  demo,
}: {
  state: StudioState;
  actor: Actor;
  request: (body: unknown) => Promise<unknown>;
  refresh: () => Promise<void>;
  openDraft: (id: string) => void;
  disabled: boolean;
  demo: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<string | null>(null),
    progressBusy = useRef(false),
    requestRef = useRef(request);
  requestRef.current = request;
  const runs =
    state.verificationRuns?.filter((r) => r.createdBy === actor.email) || [];
  const active = runs.find((r) =>
    r.cases.some((c) => ["pending", "ideas", "writing"].includes(c.phase)),
  );
  useEffect(() => {
    if (!active || demo || disabled) return;
    let live = true;
    const tick = async () => {
      if (progressBusy.current) return;
      progressBusy.current = true;
      try {
        await requestRef.current({ action: "advance", runId: active.id });
        if (live) setError("");
      } catch (e) {
        if (live)
          setError(
            e instanceof Error ? e.message : "Sample progress needs attention.",
          );
      } finally {
        progressBusy.current = false;
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [active?.id, demo, disabled]);
  let plan: { preparationCents: number; reviewCents: number } | undefined,
    blocker = "";
  try {
    plan = verificationPreflight(state, actor);
  } catch (e) {
    blocker = e instanceof Error ? e.message : "Setup incomplete.";
  }
  return (
    <section
      className="s-panel s-panel-padding"
      aria-label="LinkedIn and Newsletter verification"
    >
      <h3>LinkedIn and Newsletter sample pack</h3>
      <p>
        Prepare three AI idea/content samples: two LinkedIn posts, followed by a
        Newsletter adapted from the first post. Two blank manual exercises let
        you write a LinkedIn post and adapt a labelled Reddit source template
        into a Newsletter yourself. Nothing is approved or published
        automatically.
      </p>
      <p>
        The dashboard advances only this explicitly authorized pack through
        existing permissions, budgets and execution leases. Keep it open during
        preparation. Failed or uncertain calls stop without an automatic retry.
        Manual exercises count as completed only after you write and review
        them.
      </p>
      {plan && (
        <p>
          Maximum preparation allowance: $
          {(plan.preparationCents / 100).toFixed(2)} for the idea and draft,
          within existing budgets. Later review requires its existing package
          authorization.
        </p>
      )}
      {blocker && <p role="status">{blocker}</p>}
      <button
        className="s-btn"
        disabled={disabled || demo || busy || Boolean(active) || !plan}
        onClick={async () => {
          pending.current ??= crypto.randomUUID();
          setBusy(true);
          setError("");
          try {
            await request({
              action: "start",
              idempotencyKey: pending.current,
              expectedVersion: state.version,
            });
            pending.current = null;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Preparation failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Preparing…" : "Prepare five-sample verification pack"}
      </button>
      {error && <p role="alert">{error}</p>}
      {demo && (
        <p>Preview does not retrieve live sources or make paid calls.</p>
      )}
      {runs.map((run) => (
        <section key={run.id}>
          <h4>Sample · {new Date(run.createdAt).toLocaleString()}</h4>
          {run.cases.length === 1 && run.cases[0].phase === "ready" && (
            <button
              className="s-btn"
              disabled={busy || disabled || demo}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await request({ action: "extend", runId: run.id });
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not continue the saved sample.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Continue remaining four samples
            </button>
          )}

          {run.cases.map((item) => {
            const content = state.contents.find(
              (c) => c.id === item.contentId && !c.deletedAt,
            );
            const jobs = state.jobs.filter(
              (j) =>
                j.id === item.ideaJobId ||
                j.id === item.writingJobId ||
                Boolean(item.contentId && j.contentId === item.contentId),
            );
            let evidence;
            try {
              evidence = item.researchJobId
                ? researchEvidence(state, actor, item.channel, [
                    item.researchJobId,
                  ])[0]
                : undefined;
            } catch {}
            const blockers = content ? copyBlockers(content) : [];
            const accepted = content && currentCopyAcceptance(content, state);
            return (
              <article key={item.id} className="s-version">
                <h4>{item.name}</h4>
                <p>
                  {item.phase === "ready"
                    ? "AI draft prepared — human verification pending"
                    : item.phase === "manual_input"
                      ? "Write this manual sample yourself"
                      : item.phase}{" "}
                  {accepted ? "· Copy approved by a human" : ""}
                </p>
                {item.error && <p role="status">{item.error}</p>}
                {content && <PostCost state={state} contentId={content.id} />}
                {content && (
                  <>
                    <h4>{content.title}</h4>
                    {content.text ? (
                      <p style={{ whiteSpace: "pre-wrap" }}>{content.text}</p>
                    ) : (
                      <p>
                        {item.mode === "manual"
                          ? "Write this manual sample yourself in the editor. It has not been completed by AI or by a template."
                          : "Waiting for the saved AI draft."}
                      </p>
                    )}
                    {blockers.length > 0 && content.text && (
                      <p>
                        {blockers.length} item(s) need attention before copy
                        approval. Open the editor to resolve highlighted inputs.
                      </p>
                    )}
                    <button
                      className="s-btn"
                      onClick={() => openDraft(content.id)}
                    >
                      Open content to edit and review
                    </button>
                  </>
                )}
                {evidence && (
                  <details>
                    <summary>
                      {evidence.citations.length} source excerpts · inspect
                      before approving
                    </summary>
                    <p>{evidence.notice}</p>
                    {evidence.citations.map((cite, i) => (
                      <article key={i}>
                        <a
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {cite.title}
                        </a>
                        <p>{cite.citedText}</p>
                      </article>
                    ))}
                  </details>
                )}
                {jobs.map((job) => (
                  <details key={job.id}>
                    <summary>
                      {job.kind} · {job.state}
                    </summary>
                    {job.error && <p>{job.error}</p>}
                    <JobCost job={job} />
                    <pre style={{ whiteSpace: "pre-wrap" }}>{job.result}</pre>
                  </details>
                ))}
              </article>
            );
          })}
        </section>
      ))}
    </section>
  );
}
