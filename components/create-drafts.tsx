"use client";

import { useState } from "react";
import { ACTIVE_CHANNELS } from "@/lib/studio/active-channels";
import { writingFormatLabel } from "@/lib/studio/channel-writing";
import type { Channel, Content, StudioState } from "@/lib/studio/types";
import { BudgetPagination } from "./budget-section";
import "./create-drafts.css";

const statuses = ["Writing", "Needs changes", "In review", "Approved", "Published"] as const;
type DraftStatus = (typeof statuses)[number];
type DraftRow = { content: Content; rank: number; status: DraftStatus };
export type CreateLayout = "Editorial workspace" | "Production board";

function revisionKey(id: string, revision: number) {
  return `${id}:${revision}`;
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York",
});

function updated(content: Content) {
  return <time dateTime={content.updatedAt}>{dateTime.format(new Date(content.updatedAt))}</time>;
}

function DraftLane({ status, rows, open }: {
  status: DraftStatus; rows: DraftRow[]; open: (draft: Content) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / 3));
  const visiblePage = Math.min(page, pages - 1);
  return (
    <section className="s-create-lane" aria-label={status}>
      <h3>{status} <span>{rows.length}</span></h3>
      {rows.slice(visiblePage * 3, visiblePage * 3 + 3).map(({ content, rank }) => (
        <button type="button" key={content.id} className="s-create-card" onClick={() => open(content)}>
          <small>#{rank} · {content.channel}</small>
          <strong>{content.title}</strong>
          <small>{updated(content)}</small>
        </button>
      ))}
      {!rows.length && <p className="s-muted">No drafts</p>}
      <BudgetPagination page={visiblePage} pages={pages} onPage={setPage} />
    </section>
  );
}

export function CreateDrafts({
  contents, packages, schedules, channel, setChannel, layout, setLayout, open,
}: {
  contents: Content[];
  packages: StudioState["packages"];
  schedules: StudioState["schedules"];
  channel: Channel | "All channels";
  setChannel: (channel: Channel | "All channels") => void;
  layout: CreateLayout;
  setLayout: (layout: CreateLayout) => void;
  open: (draft: Content) => void;
}) {
  const [status, setStatus] = useState<DraftStatus | "All statuses">("All statuses");
  const [format, setFormat] = useState("");
  const [sort, setSort] = useState("Newest first");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string>();
  const approved = new Set(packages.map(item => revisionKey(item.contentId, item.revision)));
  const publishedPackages = new Set(schedules.filter(item => item.state === "published").map(item => item.packageId));
  const published = new Set(packages.filter(item => publishedPackages.has(item.id))
    .map(item => revisionKey(item.contentId, item.revision)));
  const rows: DraftRow[] = contents.slice().sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
  ).map((content, index) => {
    const revision = revisionKey(content.id, content.revision);
    return {
      content, rank: index + 1,
      status: published.has(revision) ? "Published" : approved.has(revision) ? "Approved" :
        content.state === "review" ? "In review" : content.state === "changes" ? "Needs changes" : "Writing",
    };
  });
  const formats = [...new Set(contents.map(content => writingFormatLabel(content.format, content.channel)))].sort();
  const matches = rows.filter(({ content, status: rowStatus }) =>
    (channel === "All channels" || content.channel === channel) &&
    (status === "All statuses" || rowStatus === status) &&
    (!format || writingFormatLabel(content.format, content.channel) === format) &&
    content.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  if (sort === "Oldest first") matches.reverse();
  if (sort === "Title A–Z") matches.sort((a, b) => a.content.title.localeCompare(b.content.title) || a.rank - b.rank);
  const preview = matches.find(row => row.content.id === selected);
  const pages = Math.max(1, Math.ceil(matches.length / 6));
  const visiblePage = Math.min(page, pages - 1);

  return (
    <section className="s-create-drafts" aria-label="Drafts">
      <div className="s-create-drafts-heading">
        <h2>Drafts</h2>
        <div className="s-actions" role="group" aria-label="Draft layout">
          {(["Editorial workspace", "Production board"] as const).map(option => (
            <button className="s-btn" type="button" key={option} aria-pressed={layout === option}
              onClick={() => setLayout(option)}>{option}</button>
          ))}
        </div>
      </div>
      <div className="s-create-filters">
        <label>Search drafts<input type="search" value={query}
          onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
        <label>Channel<select value={channel}
          onChange={event => { setChannel(event.target.value as Channel | "All channels"); setPage(0); }}>
          {["All channels", ...ACTIVE_CHANNELS].map(option => <option key={option}>{option}</option>)}
        </select></label>
        <label>Status<select value={status} onChange={event => {
          setStatus(event.target.value as typeof status); setPage(0);
        }}>{["All statuses", ...statuses].map(option => <option key={option}>{option}</option>)}</select></label>
        <label>Format<select value={format} onChange={event => { setFormat(event.target.value); setPage(0); }}>
          <option value="">All formats</option>
          {formats.map(option => <option key={option}>{option}</option>)}
        </select></label>
        <label>Sort<select value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}>
          {["Newest first", "Oldest first", "Title A–Z"].map(option => <option key={option}>{option}</option>)}
        </select></label>
      </div>
      <p className="s-muted s-create-count">{matches.length} {matches.length === 1 ? "draft" : "drafts"} · #1 is the most recently updated · Times shown in ET</p>
      {!matches.length ? <p className="s-create-empty">No drafts match these filters.</p> :
        layout === "Production board" ? (
          <div className="s-create-lanes">
            {statuses.filter(value => status === value || (status === "All statuses" &&
              (value !== "Published" && value !== "Approved" || matches.some(row => row.status === value))))
              .map(value => <DraftLane key={`${value}:${channel}:${format}:${query}:${sort}`} status={value}
                rows={matches.filter(row => row.status === value)} open={open} />)}
          </div>
        ) : (
          <div className="s-create-editorial">
            <div className="s-create-table-wrap">
              <table className="s-create-table">
                <thead><tr><th>#</th><th>Draft</th><th>Channel</th><th>Status</th><th>Updated</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>{matches.slice(visiblePage * 6, visiblePage * 6 + 6).map(({ content, rank, status }) => (
                  <tr key={content.id} data-selected={selected === content.id}>
                    <td>#{rank}</td>
                    <td><button type="button" className="s-text-button s-create-title" aria-pressed={selected === content.id}
                      onClick={() => setSelected(content.id)}>{content.title}</button>
                      <small>{writingFormatLabel(content.format, content.channel)}</small></td>
                    <td>{content.channel}</td><td>{status}</td><td>{updated(content)}</td>
                    <td><button type="button" className="s-btn s-small-btn" aria-label={`Open ${content.title}`}
                      onClick={() => open(content)}>Open</button></td>
                  </tr>
                ))}</tbody>
              </table>
              <BudgetPagination page={visiblePage} pages={pages} onPage={setPage} />
            </div>
            <aside className="s-create-preview" aria-label="Draft preview">
              <h3>Draft preview</h3>
              {preview ? <>
                <strong>{preview.content.title}</strong>
                <p className="s-muted">{preview.content.channel} · {preview.status}</p>
                <p className="s-create-excerpt">{preview.content.text.trim().slice(0, 500) || "No draft copy yet."}</p>
                <button type="button" className="s-btn" onClick={() => open(preview.content)}>Open editor</button>
              </> : <p className="s-muted">Select a draft title to preview it.</p>}
            </aside>
          </div>
        )}
    </section>
  );
}
