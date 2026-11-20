"use client";

import { writingFormatLabel } from "@/lib/studio/channel-writing";
import { IDEA_TEXT_ALTERNATIVES } from "@/lib/studio/idea-alternatives";
import { researchSourceMinimum } from "@/lib/studio/research-methodology";
import { IdeasRequestBoard } from "./ideas-request-board";
import type { IdeaStage } from "@/lib/studio/idea-board";
import { useId, useRef, useState } from "react";
import { SourceReferences } from "./idea-evidence";
import { X } from "lucide-react";
import type { Content, Idea, Schedule, Job, Channel } from "@/lib/studio/types";
import "./ideas-browser.css";

const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Compact idea summaries; the retained brief and sources live in the detail dialog. */
export function IdeasBrowser({
  ideas,
  targetChannel,
  jobs = [],
  onStage,
  canStage,
  renderRequestStatus,
  includeEmptyRequests,
  allIdeas,
  contents,
  schedules,
  actorEmail,
  automaticWriting = false,
  canReview,
  canUse,
  canReuse,
  busy,
  error,
  onOpen,
  onUse,
  onApprove,
  onReject,
  onReuse,
  onNewsletter,
  renderResearch,
  onGenerateAlternatives,
  onChooseAlternative,
}: {
  renderResearch?: (idea: Idea) => import("react").ReactNode;
  targetChannel?:Channel;
  ideas: Idea[];
  jobs?: Job[];
  onStage?: (idea: Idea, stage: IdeaStage) => Promise<boolean>;
  canStage?: (idea: Idea) => boolean;
  renderRequestStatus?: (job: Job) => import("react").ReactNode;
  includeEmptyRequests?: boolean;
  allIdeas: Idea[];
  contents: Content[];
  schedules: Schedule[];
  actorEmail: string;
  automaticWriting?: boolean;
  canReview: (idea: Idea) => boolean;
  canUse: (idea: Idea, account: string) => boolean;
  canReuse: (idea: Idea) => boolean;
  busy: boolean;
  error: string;
  onOpen: () => void;
  onUse: (idea: Idea, format: string, account: string) => Promise<boolean>;
  onApprove: (idea: Idea) => Promise<boolean>;
  onReject: (idea: Idea) => void;
  onReuse: (idea: Idea, mode: "revise" | "copy") => Promise<boolean>;
  onGenerateAlternatives?: (idea: Idea, account: string) => Promise<void>;
  onChooseAlternative?: (draft: Content) => Promise<boolean>;
  onNewsletter?: (idea: Idea) => boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [format, setFormat] = useState("Text post");
  const [account, setAccount] = useState("RyzaLab");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const selected = allIdeas.find((idea) => idea.id === selectedId);
  const publicationDate = (idea: Idea) => {
    const contentIds = new Set(
      contents
        .filter((content) => content.ideaId === idea.id)
        .map((content) => content.id),
    );
    return schedules
      .filter(
        (schedule) =>
          contentIds.has(schedule.contentId) &&
          schedule.state === "published" &&
          schedule.confirmedAt,
      )
      .map((schedule) => schedule.confirmedAt!)
      .sort()
      .at(-1);
  };
  function open(idea: Idea) {
    onOpen();
    setSelectedId(idea.id);
    const existing = contents.find(
      (content) =>
        content.ideaId === idea.id &&
        (!targetChannel||content.channel===targetChannel) &&
        content.createdBy === actorEmail &&
        !content.deletedAt,
    );
    setFormat(
      onGenerateAlternatives && (targetChannel ?? idea.channel) === "LinkedIn" && (existing?.format ?? idea.format) !== "Article" ? "Text post" : existing?.format ||
        ([
          "Text post",
          "Carousel",
          "Image",
          "Video",
          "Article",
          "Blog",
          "Newsletter",
          "Audio",
        ].includes(idea.format || "")
          ? idea.format!
          : "Text post"),
    );
    setAccount(existing?.account || "RyzaLab");
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
  }
  const linkedInFormat = (targetChannel ?? selected?.channel) === "LinkedIn";
  const draftFormat = onGenerateAlternatives && !linkedInFormat ? (targetChannel === "Newsletter" ? "Newsletter" : "Text post") : format;
  const linkedDraft =
    selected &&
    contents.find(
      (content) =>
        content.ideaId === selected.id && !content.ideaTextAlternative &&
        (!targetChannel || content.channel === targetChannel) &&
        content.format === draftFormat &&
        content.account === account.trim() &&
        content.createdBy === actorEmail &&
        !content.deletedAt,
    );
  return (
    <section className="s-ideas-browser" aria-label="Ideas">
      <IdeasRequestBoard
        ideas={ideas}
        allIdeas={allIdeas}
        jobs={jobs}
        busy={busy}
        onSelect={open}
        onStage={onStage}
        canStage={canStage}
        renderRequestStatus={renderRequestStatus}
        includeEmptyRequests={includeEmptyRequests}
      />
      <dialog
        ref={dialog}
        className="s-review-dialog s-idea-detail"
        aria-labelledby={titleId}
        onClose={() => setSelectedId(undefined)}
      >
        {selected && (
          <>
            <header className="s-review-dialog-heading">
              <div>
                <span className="s-muted">
                  {selected.channel} · {selected.state}
                </span>
                <h2 id={titleId}>{selected.title}</h2>
              </div>
              <button
                type="button"
                className="s-icon-button"
                aria-label="Close idea"
                onClick={close}
              >
                <X size={22} />
              </button>
            </header>
            <div className="s-review-dialog-body">
              <p className="s-muted">
                Created {date(selected.createdAt)}
                {publicationDate(selected)
                  ? ` · Publication confirmed ${date(publicationDate(selected)!)}`
                  : ""}{" "}
                ·{" "}
                {selected.origin === "agent"
                  ? "Agent generated"
                  : selected.origin === "demo_sample"
                    ? "Demo sample"
                    : "Added manually"}
              </p>
              <h3>Idea</h3>
              <p className="s-idea-detail-text">
                {selected.brief || "An idea waiting to take shape."}
              </p>
              {selected.audience && (
                <>
                  <h3>Audience</h3>
                  <p>{selected.audience}</p>
                </>
              )}
              {selected.format && (
                <>
                  <h3>Suggested format</h3>
                  <p>{selected.format}</p>
                </>
              )}
              {selected.rejection && (
                <>
                  <h3>Feedback</h3>
                  <p className="s-idea-detail-text">{selected.rejection}</p>
                </>
              )}
              {selected.researchSourceCount !== undefined && selected.researchSourceCount < researchSourceMinimum
                ? <p role="status">Provisional idea · {selected.researchSourceCount} usable public sources.</p>
                : selected.researchUnavailable && <p role="status">Provisional idea · public evidence wasn’t available.</p>}
              {renderResearch?.(selected)}
              {!!selected.sources?.length && (
                <>
                  <h3>Source references</h3>
                  <SourceReferences sources={selected.sources} />
                </>
              )}
              {selected.state !== "rejected" && (
                <div className="s-idea-create-options">
                  {(!onGenerateAlternatives || linkedInFormat) && (
                  <label>
                    Draft format
                    <select
                      value={format}
                      onChange={(event) => setFormat(event.target.value)}
                    >
                      {(onGenerateAlternatives ? ["Text post", "Article"] : [
                        "Text post",
                        "Carousel",
                        "Image",
                        "Video",
                        "Article",
          "Blog",
                        "Newsletter",
                        "Audio",
                      ]).map((option) => (
                        <option key={option} value={option}>{writingFormatLabel(option, targetChannel ?? selected.channel)}</option>
                      ))}
                    </select>
                  </label>
                  )}
                  <label>
                    Account / publication
                    <input
                      value={account}
                      onChange={(event) => setAccount(event.target.value)}
                    />
                  </label>
                </div>
              )}
              {onGenerateAlternatives && selected.state !== "rejected" && (
                <section className="s-version" aria-label="Draft alternatives">
                  <h3>Compare three text posts</h3>
                  <p>Get a story-led post, a practical guide, and a point of view from this idea. Each uses the monthly AI budget.</p>
                  <button type="button" className="s-btn"
                    disabled={busy || !account.trim() || !canUse(selected, account.trim())}
                    onClick={() => void onGenerateAlternatives(selected, account.trim())}>
                    {busy ? "Generating posts…" : "Generate 3 text posts"}
                  </button>
                  {contents.filter((draft) =>
                    draft.ideaId === selected.id && draft.createdBy === actorEmail && !draft.deletedAt && draft.ideaTextAlternative &&
                    draft.channel === (targetChannel ?? selected.channel) && draft.account === account.trim() && draft.text.trim(),
                  ).map((draft) => {
                    const label = IDEA_TEXT_ALTERNATIVES[draft.ideaTextAlternative!].label;
                    return (
                      <details className="s-version" key={draft.id}>
                        <summary>{label}{selected.selectedTextAlternativeId === draft.id ? " · Selected for final review" : ""}</summary>
                        <p style={{ whiteSpace: "pre-wrap" }}>{draft.text}</p>
                        <button type="button" className="s-btn" disabled={busy}
                          onClick={async () => { if (await onChooseAlternative?.(draft)) close(); }}>
                          Choose {label.toLowerCase()} for final review
                        </button>
                      </details>
                    );
                  })}
                </section>
              )}
              {error && (
                <div className="s-alert s-error" role="alert">
                  {error}
                </div>
              )}
              <div className="s-card-actions">
                {onNewsletter && selected.state !== "rejected" && (
                  <button
                    className="s-btn"
                    disabled={busy}
                    onClick={() => {
                      if (onNewsletter(selected)) close();
                    }}
                  >
                    Use idea in Brand Newsletter
                  </button>
                )}
                {selected.state !== "rejected" && (
                  <button
                    type="button"
                    className="s-btn s-primary"
                    disabled={
                      busy ||
                      !account.trim() ||
                      !canUse(selected, account.trim())
                    }
                    onClick={async () => {
                      if (await onUse(selected, draftFormat, account.trim()))
                        close();
                    }}
                  >
                    {linkedDraft
                      ? "Open linked draft"
                      : automaticWriting
                        ? "Use idea & prepare draft with AI"
                        : onGenerateAlternatives ? "Create draft" : "Use idea & open draft"}
                  </button>
                )}
                {selected.state === "pending" && (
                  <>
                    <button
                      type="button"
                      className="s-btn"
                      disabled={busy || !canReview(selected)}
                      onClick={async () => {
                        await onApprove(selected);
                      }}
                    >
                      Approve idea
                    </button>
                    <button
                      type="button"
                      className="s-btn"
                      disabled={busy || !canReview(selected)}
                      onClick={() => {
                        const idea = selected;
                        close();
                        onReject(idea);
                      }}
                    >
                      Request changes
                    </button>
                  </>
                )}
                {selected.state === "rejected" && (
                  <>
                    <button
                      type="button"
                      className="s-btn"
                      disabled={busy || !canReuse(selected)}
                      onClick={async () => {
                        if (await onReuse(selected, "revise")) close();
                      }}
                    >
                      Revise idea
                    </button>
                    <button
                      type="button"
                      className="s-btn"
                      disabled={busy || !canReuse(selected)}
                      onClick={async () => {
                        if (await onReuse(selected, "copy")) close();
                      }}
                    >
                      Copy idea
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
