"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import type { Job } from "@/lib/studio/types";
import { BudgetPagination } from "./budget-section";
import "./generation-activity.css";

const activityFilters = ["All requests", "Needs attention", "In progress", "Completed"] as const;
type ActivityFilter = (typeof activityFilters)[number];

function activityGroup(job: Job): ActivityFilter {
  if (["awaiting_confirmation", "unknown", "failed", "blocked"].includes(job.state) ||
      ["invalid", "incomplete", "conflict"].includes(job.outputStatus ?? "")) return "Needs attention";
  if (job.state === "queued" || job.state === "running") return "In progress";
  return "Completed";
}

export function GenerationActivity({
  jobs, renderJob, formatCost,
}: {
  jobs: Job[];
  renderJob: (job: Job) => ReactNode;
  formatCost: (cents: number) => string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("All requests");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();
  const selectedJob = jobs.find(job => job.id === selected);
  const query = search.trim().toLowerCase();
  const matching = jobs.filter(job =>
    (filter === "All requests" || activityGroup(job) === filter) &&
    [job.kind, job.channel, job.state, job.prompt, job.createdAt]
      .some(value => value.toLowerCase().includes(query)),
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.min(page, pages - 1);

  return (
    <div className="s-activity-list">
      <div className="s-activity-toolbar">
        <label className="s-field">Search activity
          <input type="search" value={search} placeholder="Channel, type, status or request"
            onChange={event => { setSearch(event.target.value); setPage(0); }} />
        </label>
        <label className="s-field">Request status
          <select value={filter} onChange={event => { setFilter(event.target.value as ActivityFilter); setPage(0); }}>
            {activityFilters.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      {matching.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(job => (
        <div className="s-activity-row" key={job.id}>
          <div><strong>{job.kind} · {job.channel}</strong>
            <p>{new Date(job.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <strong>{job.state.replaceAll("_", " ")}</strong>
            <p>{job.actual != null ? `${formatCost(job.actual)} recorded` :
              job.reserved ? `${formatCost(job.reserved)} reserved` : `${formatCost(job.estimate)} estimated`}</p>
          </div>
          <button type="button" className="s-btn s-small-btn"
            aria-label={`Inspect ${job.kind} request for ${job.channel}`}
            onClick={() => { setSelected(job.id); dialog.current?.showModal(); }}>Inspect</button>
        </div>
      ))}
      {!matching.length && <p className="s-muted">{jobs.length ? "No matching requests." : "No generation activity yet."}</p>}
      <BudgetPagination page={currentPage} pages={pages} onPage={setPage} />
      <dialog className="s-review-dialog s-activity-dialog" ref={dialog} aria-labelledby={headingId}>
        <div className="s-review-dialog-heading">
          <h2 id={headingId}>Request details</h2>
          <button type="button" className="s-btn s-small-btn" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        <div className="s-review-dialog-body">{selectedJob ? renderJob(selectedJob) : <p>Request unavailable.</p>}</div>
      </dialog>
    </div>
  );
}
