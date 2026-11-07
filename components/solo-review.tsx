"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  Actor,
  Command,
  Content,
  Package,
  StudioState,
} from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";
import { currentWorkflow } from "@/lib/studio/stages";
import { copyIdentity, packageReadiness } from "@/lib/studio/solo-quality";
import { researchEvidence } from "@/lib/studio/research-link";
import { SlideLayerPreview } from "./slide-layers";
import "./solo-review.css";

/** One human decision. Checks and billing outcomes retain their true status. */
export function SoloReview({
  content,
  state,
  actor,
  send,
  renderAsset,
  requestChanges,
  refresh,
  demo,
  onApproved,
  progressJob,
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
  progressJob?: (id: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [override, setOverride] = useState(false),
    [reason, setReason] = useState("");
  const started = useRef(new Set<string>());
  const policy = state.settings.reviewPolicy,
    workflow = currentWorkflow(content, state);
  const readiness = packageReadiness(content, state, true);
  const identity = copyIdentity(content, state);
  const allowed = can(state, actor, "package.approve", {
    channel: content.channel,
    contentId: content.id,
    account: content.account,
    assignedTo: content.assignedTo,
  });
  const current = state.jobs.find(
    (j) => j.id === content.automaticReview?.jobId,
  );
  const issues = [...readiness.blockers];
  if (content.automaticReview?.error && !readiness.agent)
    issues.push(content.automaticReview.error);
  let sources: ReturnType<typeof researchEvidence> = [];
  try {
    sources = researchEvidence(
      state,
      actor,
      content.channel,
      content.researchJobIds,
    );
  } catch (e) {
    issues.push(
      e instanceof Error ? e.message : "Source access needs attention.",
    );
  }
  const allFindings=[...new Set(issues)];
  const operationalFindings=allFindings.filter(issue=>/Generation or review is still pending|automatic textual review must finish|previous review outcome is uncertain|previous review did not attach|Resolve existing active|package allowance|review setup|active channel setup|current independent AI review/i.test(issue));
  const findings=allFindings.filter(issue=>!operationalFindings.includes(issue));
  // Existing review drafts enter the same submission path, without an invented approval.
  useEffect(() => {
    if (
      demo ||
      !allowed ||
      !policy?.autoReview ||
      content.reviewSubmission?.identity === identity
    )
      return;
    const key = `submit:${identity}`;
    if (started.current.has(key)) return;
    started.current.add(key);
    void send({ type: "content.submit", id: content.id }).catch((e) =>
      setError(
        e instanceof Error ? e.message : "Could not start automatic checks.",
      ),
    );
  }, [
    demo,
    allowed,
    policy?.autoReview,
    identity,
    content.reviewSubmission?.identity,
    content.id,
    send,
  ]);
  useEffect(() => {
    if (
      demo ||
      !current ||
      current.state !== "queued" ||
      current.createdBy !== actor.email ||
      !progressJob
    )
      return;
    if (started.current.has(current.id)) return;
    started.current.add(current.id);
    void progressJob(current.id).catch((e) =>
      setError(
        e instanceof Error
          ? e.message
          : "Automatic checks need attention. You can edit or override below.",
      ),
    );
  }, [demo, current?.id, current?.state, actor.email, progressJob]);
  useEffect(() => {
    if (demo || readiness.agent || !policy?.autoReview) return;
    const timer = window.setInterval(
      () => void refresh().catch(() => {}),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [demo, readiness.agent?.jobId, policy?.autoReview, refresh]);
  async function approve() {
    if (!workflow) return;
    setBusy(true);
    setError("");
    try {
      const result = (await send({
        type: "package.approve",
        contentId: content.id,
        expectedRevision: content.revision,
        expectedWorkflowId: workflow.id,
        expectedRuleVersion: state.settings.protectedVersion,
        expectedPolicyVersion: policy?.version,
        singleReview: true,
        handoff: true,
        authorizeNote: content.channel === "Notes",
        ...(override ? { overrideReason: reason.trim() } : {}),
      })) as { state?: StudioState } | undefined;
      const pkg = result?.state?.packages.find(
        (p) => p.contentId === content.id && p.revision === content.revision,
      );
      if (pkg && result?.state) onApproved?.(pkg, result.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save approval.");
    } finally {
      setBusy(false);
    }
  }
  const status =
    current?.state === "unknown" ? "AI review outcome needs recovery — your draft is preserved" :
    current?.state === "running"
      ? "AI review in progress…"
      : current?.state === "queued"
        ? "AI review queued…"
        : operationalFindings.length ? "AI preparation needs attention — your draft is preserved"
        : findings.length
          ? "Checks need attention — edit or override to continue"
          : readiness.agent
            ? "AI review complete"
            : policy?.autoReview
              ? "Preparing automatic checks…"
              : "Ready for your review";
  return (
    <section className="s-solo-review" aria-label="Review and publish">
      {content.media.imageUrl && (
        <div className="s-solo-asset">
          {renderAsset(content.media.imageUrl)}
        </div>
      )}
      {content.media.slides.map((slide, i) => (
        <div key={slide.id}>
          <h4>Slide {i + 1}</h4>
          {slide.image && renderAsset(slide.image)}
          <p>{slide.title}</p>
          <p>{slide.body}</p>
          {!!slide.layers?.length && (
            <div
              className="s-slide-preview"
              style={{ background: slide.background, color: slide.color }}
            >
              {slide.layers.map((layer) => (
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
          )}
        </div>
      ))}
      {content.media.scenes.map((scene, i) => (
        <div key={scene.id}>
          <h4>Scene {i + 1}</h4>
          {scene.sourceUrl && renderAsset(scene.sourceUrl, "video")}
          <p>{scene.script}</p>
        </div>
      ))}
      {content.media.narration && (
        <details>
          <summary>Narration</summary>
          <p>{content.media.narration}</p>
        </details>
      )}
      {content.media.captions && (
        <details>
          <summary>Captions</summary>
          <p>{content.media.captions}</p>
        </details>
      )}
      {!!sources.length && (
        <details>
          <summary>Sources used in this draft</summary>
          {sources
            .flatMap((source) => source.citations)
            .map((citation, i) => (
              <article key={i}>
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {citation.title || citation.url}
                </a>
                {citation.accessNote && <p>{citation.accessNote}</p>}
                <p>{citation.citedText}</p>
              </article>
            ))}
        </details>
      )}
      <p role="status">
        <strong>{status}</strong>
      </p>
      {readiness.agent && <p>{readiness.agent.summary}</p>}
      {!!operationalFindings.length&&<details><summary>Processing details — not content corrections</summary><p>These messages describe the same review preparation/recovery problem. They are not separate writing tasks.</p><ul>{operationalFindings.map(issue=><li key={issue}>{issue}</li>)}</ul></details>}
      <details>
        <summary>
          Check details
          {findings.length ? ` · ${findings.length} need attention` : ""}
        </summary>
        <ul>
          {readiness.checks.map((check) => (
            <li key={check.label}>
              <strong>{check.label}:</strong> {check.detail}
            </li>
          ))}
        </ul>
        {!!findings.length && (
          <ul>
            {findings.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        {readiness.agent?.issues
          .filter((i) => i.severity === "warning")
          .map((issue, i) => (
            <p key={i}>{issue.message}</p>
          ))}
        <p>
          AI findings are based on the supplied references. Your final decision
          covers the displayed content and media.
        </p>
      </details>
      {allowed && (
        <>
          <details open={override || undefined}>
            <summary>Override checks and continue</summary>
            <p>
              You can continue despite a pending or failed editorial check. The
              original findings and any unresolved costs remain recorded.
            </p>
            <label className="s-solo-confirm">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
              />{" "}
              Publish with manual override
            </label>
            {override && (
              <label className="s-solo-label">
                Reason
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                  placeholder="Why are you proceeding despite these checks?"
                />
              </label>
            )}
          </details>
          <button
            className="s-btn s-primary"
            disabled={
              busy ||
              !workflow ||
              (!override && !readiness.ready) ||
              (override && reason.trim().length < 5)
            }
            onClick={() => void approve()}
          >
            {busy
              ? "Saving…"
              : override
                ? "Approve & publish with override"
                : "Approve & publish"}
          </button>
          <button className="s-btn" disabled={busy} onClick={requestChanges}>
            Request changes
          </button>
          <p>
            Publishing is manual: approval prepares this exact version for
            copying or downloading. It does not send it to {content.channel}.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="s-alert s-error">
          {error}
        </p>
      )}
    </section>
  );
}
