"use client";

import { useRef, useState, type ReactNode } from "react";
import type { Job } from "@/lib/studio/types";
import "./generation-activity.css";

const activeStates: Job["state"][] = [
  "awaiting_confirmation",
  "queued",
  "running",
  "unknown",
];
const pageSize = 20;

/** Keeps unfinished and uncertain work visible and offers older history on demand. */
export function GenerationActivity({
  jobs,
  renderJob,
}: {
  jobs: Job[];
  renderJob: (job: Job) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const newest = jobs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = newest.filter((job) => activeStates.includes(job.state));
  const finished = newest.filter((job) => !activeStates.includes(job.state));
  const recent = finished.slice(0, 10);
  const older = finished.slice(10);
  const query = search.trim().toLocaleLowerCase();
  const matching = older.filter((job) =>
    [job.kind, job.channel, job.state, job.prompt, job.createdAt]
      .some((value) => value.toLocaleLowerCase().includes(query)),
  );
  const lastPage = Math.max(0, Math.ceil(matching.length / pageSize) - 1);
  const visiblePage = Math.min(page, lastPage);
  const pageItems = matching.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);

  return (
    <>
      {active.length > 0 && <p className="s-activity-label">In progress or needs attention</p>}
      {active.map(renderJob)}
      {recent.length > 0 && <p className="s-activity-label">Recent activity</p>}
      {recent.map(renderJob)}
      {!jobs.length && <p className="s-activity-empty">No generation activity yet.</p>}
      {older.length > 0 && (
        <div className="s-activity-footer">
          <button className="s-btn s-small-btn" onClick={() => dialog.current?.showModal()}>
            View older activity ({older.length})
          </button>
        </div>
      )}
      <dialog className="s-review-dialog s-activity-dialog" ref={dialog} aria-labelledby="activity-history-title">
        <div className="s-review-dialog-heading">
          <h2 id="activity-history-title">Older generation activity</h2>
          <button className="s-btn s-small-btn" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        <div className="s-review-dialog-body">
          <label className="s-activity-search">
            <span>Search activity</span>
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              placeholder="Channel, type, status or request"
            />
          </label>
          {pageItems.map(renderJob)}
          {!pageItems.length && <p className="s-activity-empty">No matching activity.</p>}
          {matching.length > pageSize && (
            <div className="s-activity-pagination">
              <button className="s-btn s-small-btn" disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>Previous</button>
              <span>Page {visiblePage + 1} of {lastPage + 1}</span>
              <button className="s-btn s-small-btn" disabled={visiblePage === lastPage} onClick={() => setPage(visiblePage + 1)}>Next</button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
