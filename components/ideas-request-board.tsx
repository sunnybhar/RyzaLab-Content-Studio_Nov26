"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Idea, Job } from "@/lib/studio/types";
import { requestedIdeaQuantity } from "@/lib/studio/idea-generation";
import {
  ideaRequestGroups,
  ideaStage,
  IDEA_STAGES,
  type IdeaStage,
} from "@/lib/studio/idea-board";
import "./ideas-request-board.css";
const labels: Record<IdeaStage, string> = {
  new: "New ideas",
  shortlisted: "Shortlisted",
  ready: "Ready to write",
};
const date = (at: string) =>
  new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export function IdeasRequestBoard({
  ideas,
  allIdeas,
  jobs,
  busy,
  onSelect,
  onStage,
  canStage,
  renderRequestStatus,
  includeEmptyRequests = true,
}: {
  ideas: Idea[];
  allIdeas: Idea[];
  jobs: Job[];
  busy: boolean;
  onSelect: (idea: Idea) => void;
  onStage?: (idea: Idea, stage: IdeaStage) => Promise<boolean>;
  canStage?: (idea: Idea) => boolean;
  renderRequestStatus?: (job: Job) => ReactNode;
  includeEmptyRequests?: boolean;
}) {
  const [view, setView] = useState<"board" | "table">("board"),
    [selected, setSelected] = useState<string>(),
    [query, setQuery] = useState(""),
    [moving, setMoving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("ryzalab-ideas-view");
    if (saved === "board" || saved === "table") setView(saved);
  }, []);
  const visibleIds = new Set(ideas.map((idea) => idea.id));
  const allGroups = useMemo(
    () => ideaRequestGroups(allIdeas, jobs),
    [allIdeas, jobs],
  );
  const groups = allGroups.filter(
    (group) =>
      (group.ideas.some((idea) => visibleIds.has(idea.id)) ||
        (includeEmptyRequests && group.job && !group.ideas.length)) &&
      (!query.trim() ||
        [
          group.number,
          group.topic,
          group.channel,
          ...group.ideas.map((idea) => idea.title),
        ].some((value) =>
          value.toLowerCase().includes(query.toLowerCase().trim()),
        )),
  );
  const firstId = groups[0]?.id;
  useEffect(() => {
    setSelected(firstId);
  }, [firstId]);
  const group = groups.find((group) => group.id === selected) || groups[0];
  const expected = group?.job
    ? requestedIdeaQuantity(group.job.prompt)
    : undefined;
  const partial = Boolean(
    group?.job &&
    (group.job.providerCompletion === "incomplete" ||
      group.job.error ||
      (expected && group.ideas.length !== expected)),
  );
  const selectedIdeas =
    group?.ideas.filter((idea) => visibleIds.has(idea.id)) || [];
  const usable = selectedIdeas.filter((idea) => idea.state !== "rejected"),
    rejected = selectedIdeas.filter((idea) => idea.state === "rejected");
  const locked = busy || moving;
  async function move(idea: Idea, stage: IdeaStage) {
    if (!onStage) return;
    setMoving(true);
    setError("");
    try {
      await onStage(idea, stage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move this idea.");
    } finally {
      setMoving(false);
    }
  }
  function changeView(next: "board" | "table") {
    setView(next);
    localStorage.setItem("ryzalab-ideas-view", next);
  }
  function stageSelect(idea: Idea) {
    return (
      <select
        aria-label={`Stage for ${idea.title}`}
        value={ideaStage(idea)}
        disabled={
          locked || !onStage || !canStage?.(idea) || idea.state === "rejected"
        }
        onChange={(e) => void move(idea, e.target.value as IdeaStage)}
      >
        {IDEA_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {labels[stage]}
          </option>
        ))}
      </select>
    );
  }
  function card(idea: Idea) {
    const stage = ideaStage(idea);
    return (
      <article className="s-iw-card" key={idea.id}>
        <span className="s-iw-format">
          {idea.channel} · {idea.format || "Idea"}
        </span>
        <button className="s-iw-card-title" onClick={() => onSelect(idea)}>
          <strong role="heading" aria-level={3}>
            {idea.title}
          </strong>
        </button>
        <p className="s-iw-angle">
          {idea.brief || "Open this idea to read its details."}
        </p>
        <div className="s-iw-card-meta">
          <span>
            {idea.sources.length
              ? `${idea.sources.length} source references`
              : idea.researchJobIds?.length
                ? "Research attached"
                : "No sources attached"}
          </span>
          <time dateTime={idea.createdAt}>
            {new Date(idea.createdAt).toLocaleDateString()}
          </time>
        </div>
        <div className="s-iw-card-actions">
          <button onClick={() => onSelect(idea)}>View idea →</button>
          {idea.state !== "rejected" &&
            (stage === "ready" ? (
              <button
                className="s-btn s-small-btn"
                disabled={locked}
                onClick={() => onSelect(idea)}
              >
                Create draft →
              </button>
            ) : (
              <button
                className="s-btn s-small-btn"
                disabled={locked || !canStage?.(idea) || !onStage}
                onClick={() =>
                  void move(idea, stage === "new" ? "shortlisted" : "ready")
                }
              >
                {stage === "new" ? "Shortlist →" : "Ready to write →"}
              </button>
            ))}
        </div>
        <details className="s-iw-move">
          <summary>Move to another stage</summary>
          {stageSelect(idea)}
        </details>
      </article>
    );
  }
  return (
    <section className="s-ideas-inbox" aria-label="Ideas workspace">
      <aside className="s-iw-inbox">
        <div className="s-iw-inbox-heading">
          <strong>Idea requests</strong>
          <span>{groups.length}</span>
        </div>
        <input
          type="search"
          aria-label="Search idea requests"
          placeholder="Search topic or request no…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="s-iw-requests">
          {groups.map((request) => (
            <button
              key={request.id}
              className="s-iw-request"
              aria-pressed={group?.id === request.id}
              onClick={() => setSelected(request.id)}
            >
              <span className="s-iw-request-meta">
                <span>{request.number}</span>
                <span>{request.ideas.length} ideas</span>
              </span>
              <strong>{request.topic}</strong>
              <span>{request.channel}</span>
              <time dateTime={request.createdAt}>
                {date(request.createdAt)}
              </time>
              <small>
                {
                  request.ideas.filter(
                    (idea) =>
                      ideaStage(idea) === "shortlisted" &&
                      idea.state !== "rejected",
                  ).length
                }{" "}
                shortlisted ·{" "}
                {
                  request.ideas.filter(
                    (idea) =>
                      ideaStage(idea) === "ready" && idea.state !== "rejected",
                  ).length
                }{" "}
                ready to write
              </small>
              {request.job &&
                [
                  "queued",
                  "running",
                  "unknown",
                  "failed",
                  "blocked",
                  "awaiting_confirmation",
                ].includes(request.job.state) && (
                  <span className="s-iw-request-status">
                    {request.job.state === "awaiting_confirmation"
                      ? "Needs allowance"
                      : request.job.state}
                  </span>
                )}
            </button>
          ))}
        </div>
        {!groups.length && <p>No requests match your filters.</p>}
        <p className="s-iw-inbox-note">
          Original topics, dates and request numbers stay with their ideas.
        </p>
      </aside>
      <div className="s-iw-main">
        {group ? (
          <>
            <header className="s-iw-heading">
              <div>
                <span>{group.number}</span>
                <time dateTime={group.createdAt}>{date(group.createdAt)}</time>
                <span>{group.channel}</span>
              </div>
              <h2>
                {group.topic.length > 240
                  ? group.topic.slice(0, 240) + "…"
                  : group.topic}
              </h2>
              {group.topic.length > 240 && (
                <details>
                  <summary>Read full request brief</summary>
                  <p style={{ whiteSpace: "pre-wrap" }}>{group.topic}</p>
                </details>
              )}
              <p>
                {group.ideas.length}
                {expected ? ` of ${expected} requested ideas` : " ideas"} ·{" "}
                {
                  group.ideas.filter(
                    (idea) =>
                      ideaStage(idea) === "shortlisted" &&
                      idea.state !== "rejected",
                  ).length
                }{" "}
                shortlisted ·{" "}
                {
                  group.ideas.filter(
                    (idea) =>
                      ideaStage(idea) === "ready" && idea.state !== "rejected",
                  ).length
                }{" "}
                ready to write
              </p>
            </header>
            {group.job && renderRequestStatus && (
              <details
                className="s-iw-generation"
                open={
                  group.job.state !== "succeeded" ||
                  group.ideas.length === 0 ||
                  partial
                }
              >
                <summary>
                  {group.job.state === "succeeded" &&
                  group.ideas.length &&
                  !partial
                    ? `${group.channel} · ${group.ideas.length} ideas ready for review`
                    : "Generation status and available actions"}
                </summary>
                {renderRequestStatus(group.job)}
              </details>
            )}
            <div className="s-iw-toolbar">
              <div
                className="s-ideas-view"
                role="group"
                aria-label="Idea layout"
              >
                <button
                  aria-pressed={view === "board"}
                  className={view === "board" ? "s-selected" : ""}
                  onClick={() => changeView("board")}
                >
                  Board view
                </button>
                <button
                  aria-pressed={view === "table"}
                  className={view === "table" ? "s-selected" : ""}
                  onClick={() => changeView("table")}
                >
                  Table view
                </button>
              </div>
              <span>Select an idea to inspect its angle and sources.</span>
            </div>
            {error && (
              <p role="alert" className="s-alert s-error">
                {error}
              </p>
            )}
            {view === "board" ? (
              <div className="s-iw-board">
                {IDEA_STAGES.map((stage) => (
                  <section
                    key={stage}
                    className={`s-iw-column s-iw-column-${stage}`}
                    aria-label={labels[stage]}
                  >
                    <div className="s-iw-column-heading">
                      <h3>{labels[stage]}</h3>
                      <span>
                        {
                          usable.filter((idea) => ideaStage(idea) === stage)
                            .length
                        }
                      </span>
                    </div>
                    {usable
                      .filter((idea) => ideaStage(idea) === stage)
                      .map(card)}
                    {!usable.some((idea) => ideaStage(idea) === stage) && (
                      <p className="s-iw-empty">
                        {stage === "new"
                          ? "No new ideas in this request."
                          : stage === "shortlisted"
                            ? "Shortlist a promising idea to keep it here."
                            : "Move an idea here when you want to begin writing."}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className="s-iw-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Idea / angle</th>
                      <th>Stage</th>
                      <th>Sources</th>
                      <th>Generated / added</th>
                      <th>Next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIdeas.map((idea) => (
                      <tr key={idea.id}>
                        <td>
                          <button onClick={() => onSelect(idea)}>
                            <strong role="heading" aria-level={3}>
                              {idea.title}
                            </strong>
                          </button>
                          <p>{idea.brief}</p>
                          <small>
                            {idea.channel}
                            {idea.state === "rejected"
                              ? " · Changes requested"
                              : ""}
                          </small>
                        </td>
                        <td>{idea.state==="rejected"?"Changes requested":stageSelect(idea)}</td>
                        <td>{idea.sources.length} references</td>
                        <td>
                          <time dateTime={idea.createdAt}>
                            {date(idea.createdAt)}
                          </time>
                        </td>
                        <td>
                          <button
                            className="s-text-button"
                            onClick={() => onSelect(idea)}
                          >
                            View idea →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!selectedIdeas.length && (
                  <p className="s-iw-empty">
                    No ideas match your filters in this request.
                  </p>
                )}
              </div>
            )}
            {view === "board" && !!rejected.length && (
              <details className="s-iw-rejected" open={usable.length === 0}>
                <summary>Changes requested ({rejected.length})</summary>
                <div>{rejected.map(card)}</div>
              </details>
            )}
            <footer className="s-iw-footer">
              Research stays attached when you create a draft. Moving a card
              organises your ideas; it does not publish or approve content.
            </footer>
          </>
        ) : (
          <div className="s-empty">
            <h3>No ideas found</h3>
            <p>Generate ideas, add one manually, or clear your filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
