"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import type {
  Actor,
  Command,
  Content,
  StudioState,
  Package,
} from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";
import { currentWorkflow } from "@/lib/studio/stages";
import { copyBlockers, packageReadiness } from "@/lib/studio/solo-quality";
import { SlideLayerPreview } from "./slide-layers";
import "./solo-review.css";

/** Two explicit human decisions, each pinned to the version displayed. */
export function SoloReview({
  content,
  state,
  actor,
  send,
  renderAsset,
  openDraft,
  recordPriceException,
  requestChanges,
  refresh,
  demo,
  onApproved,
}: {
  content: Content;
  state: StudioState;
  actor: Actor;
  send: (command: Command) => Promise<unknown>;
  renderAsset: (
    source: string,
    kind?: "image" | "video" | "audio",
  ) => ReactNode;
  openDraft: () => void;
  recordPriceException: () => void;
  requestChanges: () => void;
  refresh: () => Promise<void>;
  demo: boolean;
  onApproved?: (pkg: Package, state: StudioState) => void;
}) {
  const [evidence, setEvidence] = useState("");
  const [copyChecked, setCopyChecked] = useState(false);
  const [reviewedPackage, setReviewedPackage] = useState(false);
  const [authorizeNote, setAuthorizeNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const policy = state.settings.reviewPolicy;
  const workflow = currentWorkflow(content, state);
  const readiness = packageReadiness(content, state);
  const copyIssues = copyBlockers(content);
  const scope = {
    channel: content.channel,
    contentId: content.id,
    account: content.account,
    assignedTo: content.assignedTo,
  };
  const allowed = can(state, actor, "package.approve", scope);
  const founder = can(state, actor, "policy.manage");
  const references = state.references.filter((ref) =>
    workflow?.references.includes(ref.id),
  );
  const accepted = readiness.acceptance;
  const reviewKey = useRef<string | undefined>(undefined);
  const activeWork = state.jobs.some(
    (job) =>
      job.contentId === content.id &&
      ["queued", "running", "awaiting_confirmation", "unknown"].includes(
        job.state,
      ),
  );
  useEffect(() => {
    if (demo || !accepted || !policy?.autoReview || readiness.agent) return;
    const timer = window.setInterval(() => {
      void refresh().catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [demo, accepted?.id, policy?.autoReview, readiness.agent?.jobId, refresh]);
  const requiresNote = content.channel === "Notes";
  async function submit(command: Command) {
    setBusy(true);
    setError("");
    try {
      const result = (await send(command)) as
        { state?: StudioState } | undefined;
      if (command.type === "package.approve" && result?.state) {
        const pkg = result.state.packages.find(
          (p) => p.contentId === content.id && p.revision === content.revision,
        );
        if (pkg) onApproved?.(pkg, result.state);
      }
      if (command.type === "content.generate") reviewKey.current = undefined;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The review could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!policy) return null;
  return (
    <div className="s-solo-review">
      <div className="s-solo-review-progress" aria-label="Review progress">
        <span className={!accepted ? "s-solo-current" : "s-solo-done"}>
          1. Copy {accepted ? "approved" : "review"}
        </span>
        <span className={accepted ? "s-solo-current" : ""}>
          2. Final package
        </span>
      </div>
      {!accepted ? (
        <section>
          <h3>1. Review the copy</h3>
          <p>
            Read the text above and check factual claims against the available
            references. Approving copy does not publish it.
          </p>

          {content.media.slides.map((slide, i) => (
            <div key={slide.id}>
              <h4>Slide {i + 1} wording</h4>
              <p className="s-solo-prewrap">
                {[
                  slide.title,
                  slide.body,
                  ...(slide.layers || [])
                    .filter((layer) => layer.kind === "text")
                    .map((layer) => (layer.kind === "text" ? layer.text : "")),
                ]
                  .filter(Boolean)
                  .join("\n") || "No text on this slide."}
              </p>
            </div>
          ))}
          {content.media.scenes.map((scene, i) => (
            <div key={scene.id}>
              <h4>Scene {i + 1} wording</h4>
              <p className="s-solo-prewrap">
                {[scene.title, scene.script].filter(Boolean).join("\n")}
              </p>
            </div>
          ))}
          {content.media.narration && (
            <>
              <h4>Narration</h4>
              <p className="s-solo-prewrap">{content.media.narration}</p>
            </>
          )}
          {content.media.captions && (
            <>
              <h4>Captions</h4>
              <p className="s-solo-prewrap">{content.media.captions}</p>
            </>
          )}
          {copyIssues.length > 0 && (
            <div className="s-alert s-error" role="alert">
              <strong>Resolve before copy approval</strong>
              <details><summary>{copyIssues.length} items need attention — edit the content above</summary><ul>
                {copyIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul></details>
            </div>
          )}
          <details className="s-review-policy">
            <summary>
              Sources available for your review ({references.length})
            </summary>
            {references.length ? (
              references.map((ref) => (
                <article key={ref.id}>
                  <h4>{ref.title}</h4>
                  <p className="s-solo-prewrap">{ref.content}</p>
                </article>
              ))
            ) : (
              <p>
                No references are attached to the active workflow. Review any
                factual claims before approving.
              </p>
            )}
          </details>
          <details className="s-review-policy">
            <summary>Channel instructions and brand rules</summary>
            <h4>Channel instructions</h4>
            <p className="s-solo-prewrap">
              {workflow?.instructions || "No active channel setup."}
            </p>
            <h4>Brand rules</h4>
            <p className="s-solo-prewrap">{state.settings.protectedRules}</p>
          </details>
          <label className="s-solo-confirm"><input type="checkbox" checked={copyChecked} onChange={e=>setCopyChecked(e.target.checked)} /> I checked the copy, factual claims and required answers.</label>
          <details><summary>Add review notes or sources checked (optional)</summary><label className="s-solo-label">
            What did you check?
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              maxLength={12000}
              placeholder="Describe the sources or evidence you checked, or explain why this copy makes no external factual claims."
            />
          </label></details>
          <button
            className="s-btn s-primary"
            disabled={
              busy ||
              !allowed ||
              !workflow ||
              (!copyChecked && evidence.trim().length < 10) ||
              copyIssues.length > 0
            }
            onClick={() =>
              workflow &&
              void submit({
                type: "content.acceptCopy",
                contentId: content.id,
                expectedRevision: content.revision,
                expectedWorkflowId: workflow.id,
                expectedRuleVersion: state.settings.protectedVersion,
                expectedPolicyVersion: policy.version,
                evidence: evidence.trim().length >= 10 ? evidence.trim() : "Reviewer confirmed checking the current copy, factual claims and required answers.",
              })
            }
          >
            {busy ? "Saving…" : "Approve copy"}
          </button>
          {!allowed && <p>You need permission to approve this copy.</p>}
        </section>
      ) : (
        <section>
          <h3>2. Review the complete package</h3>
          <p>
            Copy approved by {accepted.actor}. Check the exact text, destination
            and all media before approving the package.
          </p>
          <div className="s-solo-destination">
            <strong>
              {content.channel} · {content.account}
            </strong>
            <span>
              {content.format} · Revision {content.revision}
            </span>
          </div>
          {content.metadata && (
            <details><summary>Publication notes (optional)</summary><p className="s-solo-prewrap">{content.metadata}</p></details>
          )}
          {content.media.imageUrl && (
            <div className="s-solo-asset">
              <h4>Image</h4>
              {renderAsset(content.media.imageUrl)}
            </div>
          )}
          {content.media.slides.map((slide, i) => (
            <div className="s-solo-asset" key={slide.id}>
              <h4>Slide {i + 1}</h4>
              <div
                className="s-slide-preview"
                style={{ background: slide.background, color: slide.color }}
              >
                {slide.image && renderAsset(slide.image)}
                <div
                  className="s-slide-copy"
                  style={{
                    left: `${slide.x}%`,
                    top: `${slide.y}%`,
                    width: `max(1px, calc(${100 - slide.x}% - 3.7037cqw))`,
                  }}
                >
                  <h2
                    style={{
                      fontSize: `calc(${slide.fontSize} / 1080 * 100cqw)`,
                    }}
                  >
                    {slide.title}
                  </h2>
                  <p
                    style={{
                      fontSize: `calc(${slide.fontSize * 0.55} / 1080 * 100cqw)`,
                      marginTop: `calc(${slide.fontSize * 0.4} / 1080 * 100cqw)`,
                    }}
                  >
                    {slide.body}
                  </p>
                </div>
                {(slide.layers || []).map((layer) => (
                  <SlideLayerPreview
                    key={layer.id}
                    layer={layer}
                    selected={false}
                    onSelect={() => {}}
                    onMove={() => {}}
                    readOnly
                  />
                ))}
              </div>
            </div>
          ))}
          {content.media.scenes.map((scene, i) => (
            <div className="s-solo-asset" key={scene.id}>
              <h4>
                Scene {i + 1}: {scene.title}
              </h4>
              {scene.sourceUrl ? (
                renderAsset(scene.sourceUrl, "video")
              ) : (
                <p>Scene media is missing.</p>
              )}
              {scene.audioUrl && renderAsset(scene.audioUrl, "audio")}
              <p className="s-solo-prewrap">{scene.script}</p>
            </div>
          ))}
          {content.media.narration && (
            <>
              <h4>Narration</h4>
              <p className="s-solo-prewrap">{content.media.narration}</p>
            </>
          )}
          {content.media.captions && (
            <>
              <h4>Captions</h4>
              <p className="s-solo-prewrap">{content.media.captions}</p>
            </>
          )}
          <h4>Automatic textual review</h4>
          {demo ? (
            <p>
              Automatic provider reviews need a live workspace and configured
              worker. No review is simulated.
            </p>
          ) : (
            !readiness.agent && (
              <p role="status">
                {content.automaticReview?.acceptanceId === accepted.id &&
                content.automaticReview.error
                  ? content.automaticReview.error
                  : activeWork
                    ? "Review preparation is queued, in progress or needs attention. Inspect uncertain work before requesting another review."
                    : policy.autoReview
                      ? "Waiting for the worker to prepare the review within this package allowance."
                      : "No AI review has been requested."}
              </p>
            )
          )}
          {!readiness.agent && (
            <button
              className="s-btn"
              disabled={
                busy ||
                demo ||
                activeWork ||
                !can(state, actor, "job.create", {
                  ...scope,
                  function: "review",
                })
              }
              onClick={() => {
                reviewKey.current ||= crypto.randomUUID();
                void submit({
                  type: "content.generate",
                  contentId: content.id,
                  expectedRevision: content.revision,
                  kind: "review",
                  idempotencyKey: reviewKey.current,
                });
              }}
            >
              Request textual review
            </button>
          )}
          <button
            className="s-text-button"
            disabled={busy}
            onClick={() =>
              void refresh().catch((cause) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not refresh review.",
                ),
              )
            }
          >
            Refresh review status
          </button>
          <h4>Review findings</h4>
          <ul>
            {readiness.checks.map((check) => (
              <li key={check.label}>
                <strong>{check.label}: </strong>
                {check.detail}
              </li>
            ))}
          </ul>
          {readiness.agent && (
            <div>
              <p>
                <strong>AI review:</strong> {readiness.agent.summary}
              </p>
              <ul>
                {readiness.agent.issues.map((issue, i) => (
                  <li key={i}>
                    {issue.severity === "block" ? "Blocking" : "Suggestion"}:{" "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {readiness.blockers.length > 0 && (
            <div className="s-alert s-error" role="alert">
              <strong>Needs attention</strong>
              <ul>
                {readiness.blockers.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {founder &&
            /\bfree\b|\$\s*\d/i.test(content.text + " " + content.metadata) && (
              <button className="s-text-button" onClick={recordPriceException}>
                Record founder price exception
              </button>
            )}
          <label className="s-solo-confirm">
            <input
              type="checkbox"
              checked={reviewedPackage}
              onChange={(e) => setReviewedPackage(e.target.checked)}
            />{" "}
            I reviewed the exact copy and all included media and approve this
            package for manual publication.
          </label>
          {requiresNote && (
            <label className="s-solo-confirm">
              <input
                type="checkbox"
                checked={authorizeNote}
                onChange={(e) => setAuthorizeNote(e.target.checked)}
              />{" "}
              As founder, I authorize release of this exact Note and its assets.
            </label>
          )}
          <button
            className="s-btn s-primary"
            disabled={
              busy ||
              !allowed ||
              !workflow ||
              !readiness.ready ||
              !reviewedPackage ||
              (requiresNote && (!founder || !authorizeNote))
            }
            onClick={() =>
              workflow &&
              void submit({
                type: "package.approve",
                contentId: content.id,
                expectedRevision: content.revision,
                expectedWorkflowId: workflow.id,
                expectedRuleVersion: state.settings.protectedVersion,
                expectedCopyAcceptanceId: accepted.id,
                expectedPolicyVersion: policy.version,
                handoff: true,
                authorizeNote: requiresNote && authorizeNote,
              })
            }
          >
            {busy ? "Approving…" : "Approve final package"}
          </button>
          {requiresNote && !founder && (
            <p>A founder must authorize this Note.</p>
          )}
        </section>
      )}
      {error && (
        <div className="s-alert s-error" role="alert">
          {error}
        </div>
      )}
      {allowed && (
        <button className="s-btn" disabled={busy} onClick={requestChanges}>
          Request changes
        </button>
      )}
      <button className="s-text-button" onClick={openDraft}>
        Open complete draft →
      </button>
    </div>
  );
}
