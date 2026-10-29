"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Content, Idea, Schedule } from "@/lib/studio/types";
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
  allIdeas,
  contents,
  schedules,
  actorEmail,
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
}: {
  ideas: Idea[];
  allIdeas: Idea[];
  contents: Content[];
  schedules: Schedule[];
  actorEmail: string;
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
}) {
  const [view, setView] = useState<"tiles" | "list">("tiles");
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
        content.createdBy === actorEmail &&
        !content.deletedAt,
    );
    setFormat(
      existing?.format ||
        ([
          "Text post",
          "Carousel",
          "Image",
          "Video",
          "Article",
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
  const linkedDraft =
    selected &&
    contents.find(
      (content) =>
        content.ideaId === selected.id &&
        content.createdBy === actorEmail &&
        !content.deletedAt,
    );
  return (
    <section className="s-ideas-browser" aria-label="Ideas">
      <div className="s-ideas-view" aria-label="Idea layout">
        <span>View</span>
        <button
          type="button"
          className={view === "tiles" ? "s-selected" : ""}
          aria-pressed={view === "tiles"}
          onClick={() => setView("tiles")}
        >
          Tiles
        </button>
        <button
          type="button"
          className={view === "list" ? "s-selected" : ""}
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          List
        </button>
      </div>
      {ideas.length ? (
        <div className={`s-ideas-results s-ideas-results-${view}`}>
          {ideas.map((idea) => {
            const published = publicationDate(idea);
            return (
              <button
                type="button"
                className="s-idea-summary"
                key={idea.id}
                onClick={() => open(idea)}
              >
                <span className="s-idea-summary-top">
                  <span>{idea.channel}</span>
                  <span className={`s-idea-state s-idea-state-${idea.state}`}>
                    {idea.state}
                  </span>
                </span>
                <strong role="heading" aria-level={2}>
                  {idea.title}
                </strong>
                <span className="s-idea-summary-dates">
                  Created {date(idea.createdAt)}
                  {published
                    ? ` · Publication confirmed ${date(published)}`
                    : ""}
                </span>
                <span className="s-idea-open">View idea →</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="s-empty">
          <h3>No ideas found</h3>
          <p>Try another filter or capture a new idea.</p>
        </div>
      )}
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
              {!!selected.sources?.length && (
                <>
                  <h3>Source references</h3>
                  <ul>
                    {selected.sources.map((source, index) => (
                      <li key={index}>{source}</li>
                    ))}
                  </ul>
                </>
              )}
              {selected.state !== "rejected" && !linkedDraft && (
                <div className="s-idea-create-options">
                  <label>
                    Draft format
                    <select
                      value={format}
                      onChange={(event) => setFormat(event.target.value)}
                    >
                      {[
                        "Text post",
                        "Carousel",
                        "Image",
                        "Video",
                        "Article",
                        "Newsletter",
                        "Audio",
                      ].map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Account / publication
                    <input
                      value={account}
                      onChange={(event) => setAccount(event.target.value)}
                    />
                  </label>
                </div>
              )}
              {error && (
                <div className="s-alert s-error" role="alert">
                  {error}
                </div>
              )}
              <div className="s-card-actions">
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
                      if (await onUse(selected, format, account.trim()))
                        close();
                    }}
                  >
                    {linkedDraft
                      ? "Open linked draft"
                      : "Use idea & open draft"}
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
