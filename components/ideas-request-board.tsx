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
import { SourceReferences } from "./idea-evidence";
import { BudgetPagination } from "./budget-section";
import "./ideas-request-board.css";
const views = [
  ["inbox", "Request Inbox"], ["board", "Editorial Board"], ["research", "Research Workspace"],
] as const;
type View = (typeof views)[number][0];
const labels: Record<IdeaStage, string> = {
  new: "New ideas",
  shortlisted: "Shortlisted",
  ready: "Ready to write",
};
const date = (at: string) =>
  new Date(at).toLocaleString("en-US", {
    timeZone: "America/New_York",
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
  renderResearch,
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
  renderResearch?: (idea: Idea) => ReactNode;
  includeEmptyRequests?: boolean;
}) {
  const [view, setView] = useState<View>("inbox"),
    [selected, setSelected] = useState<string>(),
    [query, setQuery] = useState(""),
    [moving, setMoving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const saved = localStorage.getItem("ryzalab-ideas-view");
    if (saved === "board" || saved === "inbox" || saved === "research") setView(saved);
    if (saved === "table") setView("inbox");
  }, []);
  const [ideaPage, setIdeaPage] = useState(0);
  const [requestPage, setRequestPage] = useState(0);
  const [lanePages, setLanePages] = useState<Record<string, number>>({});
  const [previewId, setPreviewId] = useState<string>();
  const [sort, setSort] = useState("Newest first");
  const [stageFilter, setStageFilter] = useState<IdeaStage | "all" | "rejected">("all");
  const ranked = useMemo(() => allIdeas.slice().sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)), [allIdeas]);
  const ranks = new Map(ranked.map((idea, i) => [idea.id, i + 1]));
  function resetPages() { setIdeaPage(0); setLanePages({}); }
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
  const requestPages = Math.max(1, Math.ceil(groups.length / 5));
  const currentRequestPage = Math.min(requestPage, requestPages - 1);
  const selectedIdeas = (view === "inbox" ? group?.ideas ?? [] : ideas).filter(idea =>
    visibleIds.has(idea.id) && (stageFilter === "all" ||
      (idea.state === "rejected" ? stageFilter === "rejected" : ideaStage(idea) === stageFilter)))
    .sort((a, b) => sort === "Title A–Z" ? a.title.localeCompare(b.title) :
      ((ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0)) * (sort === "Oldest first" ? -1 : 1));
  const usable = selectedIdeas.filter(idea => idea.state !== "rejected");
  const rejected = selectedIdeas.filter(idea => idea.state === "rejected");
  const pages = Math.max(1, Math.ceil(selectedIdeas.length / 6));
  const currentIdeaPage = Math.min(ideaPage, pages - 1);
  const preview = selectedIdeas.find(idea => idea.id === previewId);
  function lane(items: Idea[], key: string) {
    const pages = Math.max(1, Math.ceil(items.length / 3));
    const page = Math.min(lanePages[key] ?? 0, pages - 1);
    return <>{items.slice(page * 3, page * 3 + 3).map(card)}
      <BudgetPagination page={page} pages={pages} onPage={next => setLanePages(previous => ({ ...previous, [key]: next }))} /></>;
  }
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
  function changeView(next: View) {
    resetPages();
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
          #{ranks.get(idea.id)} · {idea.channel} · {idea.format || "Idea"}
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
            {date(idea.createdAt)}
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
    <section aria-label="Ideas workspace">
      <div className="s-iw-view-toolbar">
        <div className="s-ideas-view" role="group" aria-label="Idea layout">
          {views.map(([value, label]) => <button type="button" key={value}
            aria-pressed={view === value} className={view === value ? "s-selected" : ""}
            onClick={() => changeView(value)}>{label}</button>)}
        </div>
        <div className="s-iw-filters">
          <label>Idea stage <select value={stageFilter}
            onChange={event => { setStageFilter(event.target.value as typeof stageFilter); resetPages(); }}>
            <option value="all">All stages</option>
            {IDEA_STAGES.map(stage => <option key={stage} value={stage}>{labels[stage]}</option>)}
            <option value="rejected">Changes requested</option>
          </select></label>
        <label>Sort ideas <select value={sort} onChange={event => { setSort(event.target.value); resetPages(); }}>
          {["Newest first", "Oldest first", "Title A–Z"].map(option => <option key={option}>{option}</option>)}
        </select></label>
        </div>
      </div>
      <p className="s-muted s-iw-count">#1 is the newest idea · Times shown in ET</p>
      <div className={`s-ideas-inbox s-iw-view-${view}`}>
      {view === "inbox" && <aside className="s-iw-inbox">
        <div className="s-iw-inbox-heading">
          <strong>Idea requests</strong>
          <span>{groups.length}</span>
        </div>
        <input
          type="search"
          aria-label="Search idea requests"
          placeholder="Search topic or request no…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setRequestPage(0); resetPages(); }}
        />
        <div className="s-iw-requests">
          {groups.slice(currentRequestPage * 5, currentRequestPage * 5 + 5).map((request) => (
            <button
              key={request.id}
              className="s-iw-request"
              aria-pressed={group?.id === request.id}
              onClick={() => { setSelected(request.id); resetPages(); }}
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
        <BudgetPagination page={currentRequestPage} pages={requestPages} onPage={setRequestPage} />
      </aside>}
      <div className="s-iw-main">
        {view !== "inbox" || group ? (
          <>
          {view === "inbox" && group && <>
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
          </>}
            {error && (
              <p role="alert" className="s-alert s-error">
                {error}
              </p>
            )}
            {view === "board" ? (
              <div className="s-iw-board">
                {IDEA_STAGES.filter(stage => stageFilter === "all" || stageFilter === stage).map((stage) => (
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
                    {lane(usable.filter(idea => ideaStage(idea) === stage), stage)}
                    {!usable.some((idea) => ideaStage(idea) === stage) && (
                      <p className="s-iw-empty">
                        {stage === "new"
                          ? "No new ideas match your filters."
                          : stage === "shortlisted"
                            ? "Shortlist a promising idea to keep it here."
                            : "Move an idea here when you want to begin writing."}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className={view === "research" ? "s-iw-research" : undefined}>
              <div className="s-iw-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Idea</th>
                      <th>Stage</th>
                      <th>Sources</th>
                      <th>Generated / added</th>
                      <th>Next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIdeas.slice(currentIdeaPage * 6, currentIdeaPage * 6 + 6).map((idea) => (
                      <tr key={idea.id}>
                        <td>#{ranks.get(idea.id)}</td>
                        <td>
                          <button onClick={() => view === "research" ? setPreviewId(idea.id) : onSelect(idea)}>
                            <strong role="heading" aria-level={3}>
                              {idea.title}
                            </strong>
                          </button>
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
                    No ideas match your filters.
                  </p>
                )}
                <BudgetPagination page={currentIdeaPage} pages={pages} onPage={setIdeaPage} />
              </div>
              {view === "research" && <aside className="s-iw-preview" aria-label="Idea and research preview">
                <h3>{preview?.title ?? "Idea and research preview"}</h3>
                {preview ? <>
                  <p className="s-muted">{preview.channel} · {preview.state === "rejected" ? "Changes requested" : labels[ideaStage(preview)]}</p>
                  <div className="s-iw-preview-body" tabIndex={0} aria-label="Idea and research">
                    <p>{preview.brief}</p>
                    {renderResearch?.(preview)}
                    {preview.sources.length > 0 && <SourceReferences sources={preview.sources} />}
                    {!preview.sources.length && !preview.researchJobIds?.length && <p>No research attached.</p>}
                  </div>
                  <button type="button" className="s-btn" onClick={() => onSelect(preview)}>Open idea</button>
                </> : <p>Select an idea title to review its angle and sources.</p>}
              </aside>}
              </div>
            )}
            {view === "board" && !!rejected.length && (
              <details className="s-iw-rejected" open={usable.length === 0}>
                <summary>Changes requested ({rejected.length})</summary>
                <div>{lane(rejected, "rejected")}</div>
              </details>
            )}
          </>
        ) : (
          <div className="s-empty">
            <h3>No ideas found</h3>
            <p>Generate ideas, add one manually, or clear your filters.</p>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
