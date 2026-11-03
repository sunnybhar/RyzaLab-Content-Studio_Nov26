"use client";

import { useEffect, useRef, useState } from "react";
import type { Actor, Command, Content, StudioState } from "@/lib/studio/types";
import {
  BUDGET_CATEGORIES,
  inferBudgetCategory,
  type BudgetCategory,
} from "@/lib/studio/budget-categories";
import { can } from "@/lib/studio/permissions";
import { ResearchPanel } from "./research-panel";
import {PostCost} from "./job-cost";
import { preparationFor } from "@/lib/studio/preparation-budget";

const cost = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const activeStates = new Set([
  "queued",
  "running",
  "awaiting_confirmation",
  "unknown",
]);

/** Status and recovery are tied to the selected draft; no job is started on render. */
export function DraftAssistant({
  content,
  state,
  actor,
  dirty,
  readOnly,
  busy,
  run,
  refresh,
  demo = false,
}: {
  content: Content;
  state: StudioState;
  actor: Actor;
  dirty: boolean;
  readOnly: boolean;
  busy: boolean;
  run: (command: Command, message?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  demo?: boolean;
}) {
  const initialBudget =
    state.preparations?.find((p) => p.id === content.preparationId)?.maxCents ||
    state.settings.reviewPolicy?.packageCap ||
    50;
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory>(
    inferBudgetCategory(initialBudget),
  );
  const [budgetAmount, setBudgetAmount] = useState(
    (initialBudget / 100).toFixed(2),
  );
  const budgetCents = Math.round(Number(budgetAmount) * 100);
  const budgetValid =
    /^\d+(?:\.\d{1,2})?$/.test(budgetAmount) &&
    budgetCents >= 50 &&
    budgetCents <= Math.min(state.settings.reviewPolicy?.packageCap || 0, 200);
  const canAuthorize = can(state, actor, "package.approve", {
    channel: content.channel,
    contentId: content.id,
    account: content.account,
    assignedTo: content.assignedTo,
  });
  const [notes, setNotes] = useState("");
  const [researchIds, setResearchIds] = useState<string[]>(
    content.researchJobIds ||
      state.ideas.find((i) => i.id === content.ideaId)?.researchJobIds ||
      [],
  );
  const [resolution, setResolution] = useState<Record<string, string>>({});
  const pendingKey = useRef<{ signature: string; key: string } | null>(null);
  const jobs = state.jobs.filter(
    (job) =>
      job.contentId === content.id &&
      job.kind === "text" &&
      job.outputContract === "draft_v1",
  );
  const active = jobs.find((job) => activeStates.has(job.state));
  const suggested = jobs.find((job) => job.candidate && !job.appliedAt);
  const recoverable = jobs.find(
    (job) =>
      !job.candidate &&
      job.result &&
      job.state === "succeeded" &&
      job.outputStatus === "invalid",
  );
  const policy =
    state.settings.reviewPolicy?.mode === "two_step"
      ? state.settings.reviewPolicy
      : undefined;
  const preparation = preparationFor(
    state,
    content,
    actor.email,
    new Date().toISOString(),
  );

  useEffect(() => {
    if (!active || !["queued", "running"].includes(active.state)) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [active?.id, active?.state, refresh]);

  async function generate() {
    const signature = JSON.stringify([
      content.id,
      content.revision,
      notes,
      researchIds,
    ]);
    if (!pendingKey.current || pendingKey.current.signature !== signature)
      pendingKey.current = { signature, key: crypto.randomUUID() };
    const ok = await run(
      {
        type: "content.generate",
        contentId: content.id,
        kind: "text",
        expectedRevision: content.revision,
        notes,
        researchJobIds: researchIds,
        idempotencyKey: pendingKey.current.key,
      },
      "Writing request started",
    );
    if (ok) pendingKey.current = null;
  }

  return (
    <section
      className="s-inline-writing-assistant"
      aria-label="Draft writing assistance"
    >
      <h3>Write with AI</h3>
      <details className="s-version">
        <summary>
          Web research
          {researchIds.length ? ` · ${researchIds.length} selected` : ""}
        </summary>
        <ResearchPanel
          state={state}
          actor={actor}
          channel={content.channel}
          content={content}
          selected={researchIds}
          onSelected={setResearchIds}
          run={run}
          refresh={refresh}
          disabled={readOnly || busy || dirty || Boolean(active)}
          demo={demo}
        />
      </details>
      {content.initialWriting?.policyVersion === policy?.version &&
        policy?.autoDraft &&
        content.automaticWriting?.error && (
          <p role="status">{content.automaticWriting.error}</p>
        )}
      {content.initialWriting &&
        content.initialWriting.policyVersion === policy?.version &&
        policy.autoDraft &&
        !content.automaticWriting &&
        !content.text.trim() && (
          <p role="status">
            First writing is waiting for the configured live worker. Demo does
            not run providers.
          </p>
        )}
      <p>
        Create or revise this saved draft with the configured writing model.
        Complete results appear in the editor below. Questions and saved
        alternatives stay in the result details.
      </p>
      {policy ? (
        <p>
          {preparation
            ? `Package allowance: ${cost(preparation.maxCents)}. Actual use is checked against all requests before starting.`
            : `Package allowance: up to ${cost(policy.packageCap)}. Authorize this draft before starting.`}
        </p>
      ) : (
        <p>
          Set up the two-step review policy to use the package allowance for
          this draft.
        </p>
      )}
      {policy && (
        <details className="s-version">
          <summary>
            Post budget · {cost(preparation?.maxCents || budgetCents)}
          </summary>
          <p>
            Choose the category for this post. This covers all its research,
            writing, review and revisions. Current founder-approved ceiling:{" "}
            {cost(Math.min(policy.packageCap, 200))}. Monthly budget stays
            unchanged.
          </p>
          <PostCost state={state} contentId={content.id} />
          <label className="s-field">
            This post's budget category
            <select
              aria-label="This post's budget category"
              disabled={busy || readOnly || Boolean(active)}
              value={budgetCategory}
              onChange={(e) => {
                const id = e.target.value as BudgetCategory;
                setBudgetCategory(id);
                if (id !== "custom")
                  setBudgetAmount(
                    (
                      BUDGET_CATEGORIES.find((category) => category.id === id)!
                        .cents / 100
                    ).toFixed(2),
                  );
              }}
            >
              {BUDGET_CATEGORIES.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                  disabled={
                    category.id !== "custom" &&
                    category.cents > Math.min(policy.packageCap, 200)
                  }
                >
                  {category.label}
                  {category.id !== "custom"
                    ? ` — ${cost(category.cents)} cap`
                    : " — choose up to $2.00"}
                </option>
              ))}
            </select>
          </label>
          <p>
            {
              BUDGET_CATEGORIES.find(
                (category) => category.id === budgetCategory,
              )?.description
            }
          </p>
          {budgetCategory === "custom" && (
            <label className="s-field">
              This post's custom cap ($)
              <input
                aria-label="This post's custom cap ($)"
                type="number"
                min="0.50"
                max={Math.min(policy.packageCap, 200) / 100}
                step="0.01"
                value={budgetAmount}
                disabled={busy || readOnly || Boolean(active)}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </label>
          )}
          {!budgetValid && (
            <p>
              Choose $0.50–$2.00 within the founder-approved ceiling, with at
              most two decimals.
            </p>
          )}
          {preparation && (
            <button
              className="s-btn"
              disabled={
                !canAuthorize ||
                !budgetValid ||
                dirty ||
                busy ||
                readOnly ||
                Boolean(active) ||
                preparation.maxCents === budgetCents
              }
              onClick={() =>
                void run(
                  {
                    type: "preparation.authorize",
                    contentId: content.id,
                    expectedRevision: content.revision,
                    maxCents: budgetCents,
                    budgetCategory,
                  },
                  "Post allowance updated; monthly budget unchanged",
                )
              }
            >
              Update this post's allowance
            </button>
          )}
        </details>
      )}
      {policy && !preparation && (
        <button
          className="s-btn"
          disabled={readOnly || busy || dirty || !budgetValid || !canAuthorize}
          onClick={() =>
            void run(
              {
                type: "preparation.authorize",
                contentId: content.id,
                expectedRevision: content.revision,
                maxCents: budgetCents,
                budgetCategory,
              },
              "Package allowance authorized",
            )
          }
        >
          Authorize package allowance
        </button>
      )}
      <details className="s-ai-instructions">
        <summary>Optional instructions</summary>
        <label className="s-field">
          Optional instructions for this draft
          <textarea
            rows={3}
            value={notes}
            disabled={readOnly || busy || Boolean(active)}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="For example, make the opening shorter."
          />
        </label>
      </details>
      <div className="s-actions">
        <button
          className="s-btn s-primary"
          disabled={
            readOnly ||
            busy ||
            dirty ||
            !policy ||
            !preparation ||
            Boolean(active)
          }
          onClick={() => void generate()}
        >
          {content.text.trim() ? "Revise with AI" : "Write with AI"}
        </button>
        {dirty && <span>Save your changes before starting.</span>}
      </div>
      {active && (
        <p role="status">
          {active.state === "queued"
            ? "Writing request is waiting to start."
            : active.state === "running"
              ? "Writing is in progress."
              : active.state === "awaiting_confirmation"
                ? "This request needs confirmation in AI & budgets."
                : "The result is unknown and needs attention in AI & budgets before another request."}
        </p>
      )}
      {active && ["queued", "awaiting_confirmation"].includes(active.state) && (
        <div className="s-actions">
          {active.state === "awaiting_confirmation" && (
            <button
              className="s-btn"
              disabled={readOnly || busy}
              onClick={() =>
                void run(
                  { type: "job.confirm", id: active.id },
                  "Writing request confirmed",
                )
              }
            >
              Confirm request
            </button>
          )}
          <button
            className="s-btn"
            disabled={readOnly || busy}
            onClick={() =>
              void run(
                { type: "job.cancel", id: active.id },
                "Writing request cancelled",
              )
            }
          >
            Cancel waiting request
          </button>
        </div>
      )}
      {suggested?.candidate && (
        <div className="s-info-strip">
          <span>
            Suggested draft ready
            {suggested.candidate.questions.length
              ? ` · ${suggested.candidate.questions.length} questions to answer`
              : ""}
            .
          </span>
          <button
            className="s-btn"
            disabled={readOnly || busy || dirty}
            onClick={() =>
              void run(
                {
                  type: "job.editDraft",
                  jobId: suggested.id,
                  expectedRevision: content.revision,
                },
                "Suggested text opened in editor; questions still need answers",
              )
            }
          >
            Open suggested text in editor
          </button>
        </div>
      )}
      {recoverable && (
        <button
          className="s-btn"
          disabled={readOnly || busy}
          onClick={() =>
            void run(
              { type: "job.prepareSavedDraft", jobId: recoverable.id },
              "Saved draft prepared — no AI call",
            )
          }
        >
          Prepare saved draft — no AI call
        </button>
      )}
      {jobs.find(job=>job.outputStatus==="incomplete"&&!job.appliedAt&&job.result)&&<button className="s-btn" disabled={readOnly||busy||dirty||Boolean(content.text.trim())} onClick={()=>void run({type:"job.recoverIncomplete",jobId:jobs.find(job=>job.outputStatus==="incomplete"&&!job.appliedAt&&job.result)!.id,expectedRevision:content.revision},"Available text recovered into the editor as unfinished — no AI call")}>Recover available text into editor — no AI call</button>}
      {jobs.slice(0, 10).map((job) => (
        <details key={job.id} className="s-version">
          <summary>
            {new Date(job.createdAt).toLocaleString()} ·{" "}
            {job.outputStatus === "incomplete"&&job.appliedAt?"Unfinished text in editor":job.outputStatus === "applied"
              ? "Applied to draft"
              : job.candidate
                ? "Saved candidate to review"
                : job.outputStatus === "incomplete" ||
                    job.outputStatus === "invalid" ||
                    job.outputStatus === "conflict"
                  ? "Needs attention"
                  : job.state.replaceAll("_", " ")}
          </summary>
          {job.error && <p role="status">{job.error}</p>}
          {job.candidate && !job.appliedAt && (
            <div>
              <p>
                Open suggested text in the editor to finish it. Unanswered
                questions remain confirmation markers in publication notes and
                block approval. Your previous saved copy remains in history.
              </p>
              <h3>Current saved text</h3>
              <pre>{content.text || "No text yet."}</pre>
              <h3>Suggested text</h3>
              <pre>{job.candidate.body}</pre>
              {job.candidate.metadata && (
                <details>
                  <summary>Suggested publication notes (optional)</summary>
                  <pre>{job.candidate.metadata}</pre>
                </details>
              )}
              {!!job.candidate.sources.length && (
                <>
                  <h3>Sources supplied by the model</h3>
                  <ul>
                    {job.candidate.sources.map((source, i) => (
                      <li key={i}>{source}</li>
                    ))}
                  </ul>
                  <p>Check these against the references before approval.</p>
                </>
              )}
              {!!job.candidate.slides?.length && (
                <>
                  <h3>Suggested slides</h3>
                  {job.candidate.slides.map((slide, i) => (
                    <p key={i}>
                      <strong>{slide.title}</strong> — {slide.body}
                    </p>
                  ))}
                  <p>Existing slide layouts and images are preserved.</p>
                </>
              )}
              {!!job.candidate.questions.length && (
                <>
                  <h3>Questions needing answers</h3>
                  <ul>
                    {job.candidate.questions.map((question, i) => (
                      <li key={i}>{question}</li>
                    ))}
                  </ul>
                  <label className="s-field">
                    How were these questions resolved?
                    <textarea
                      rows={3}
                      value={resolution[job.id] || ""}
                      onChange={(e) =>
                        setResolution((old) => ({
                          ...old,
                          [job.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              )}
              <p>
                Applying replaces the saved text and publication notes. The
                previous version remains in history.
              </p>
              <button
                className="s-btn"
                disabled={
                  readOnly ||
                  busy ||
                  dirty ||
                  (!!job.candidate.questions.length &&
                    (resolution[job.id] || "").trim().length < 10)
                }
                onClick={() =>
                  void run(
                    {
                      type: "job.applyDraft",
                      jobId: job.id,
                      expectedRevision: content.revision,
                      ...(job.candidate?.questions.length
                        ? { questionsResolution: resolution[job.id].trim() }
                        : {}),
                    },
                    "Candidate applied to draft",
                  )
                }
              >
                Apply reviewed candidate
              </button>
            </div>
          )}
          {!job.candidate && job.result && job.outputStatus !== "applied" && (
            <details>
              <summary>View saved provider response</summary>
              <pre>{job.result}</pre>
            </details>
          )}
        </details>
      ))}
    </section>
  );
}
