"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { Channel } from "@/lib/studio/types";
import { BudgetPagination } from "./budget-section";
import "./calendar-workspace.css";

const views = ["Month & Day Agenda", "Weekly Agenda", "Workflow Planner", "Pipeline Intake"] as const;
export type CalendarView = (typeof views)[number];
const kinds = ["Drafting", "Editing", "Workflow", "Publication", "Imported brief"] as const;
export type CalendarItem = {
  id: string;
  title: string;
  kind: (typeof kinds)[number];
  channel: Channel;
  status: string;
  day?: string;
  time?: string;
  timeOrder?: string;
  onOpen: () => void;
  openLabel: string;
  actions?: (close: () => void) => ReactNode;
  notes?: string;
  publicationUrl?: string;
};
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const atNoon = (day: string) => new Date(`${day}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
function addDays(day: string, offset: number) {
  const date = atNoon(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return iso(date);
}
function label(day: string, options: Intl.DateTimeFormatOptions) {
  return atNoon(day).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
const dateLabel = (day: string) => label(day, { weekday: "long", month: "short", day: "numeric" });
const monthLabel = (day: string) => label(day, { month: "long", year: "numeric" });

function CalendarList({ items, size, showDay, groupByDay, inspect, room }: {
  items: CalendarItem[]; size: number; showDay?: boolean; groupByDay?: boolean;
  inspect: (item: CalendarItem) => void; room?: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * size, (current + 1) * size);
  return (
    <div className="s-cal-list">
      {visible.map((item, index) => (
        <Fragment key={item.id}>
        {groupByDay && item.day && visible[index - 1]?.day !== item.day && (
          <h3 className="s-cal-day-group">{dateLabel(item.day)}</h3>
        )}
        <div className="s-cal-item s-schedule-row">
          <div>
            <button type="button" className="s-link-button" onClick={() => inspect(item)}>{item.title}</button>
            <p>{item.channel} · {item.kind} · {item.status}</p>
            <p>{item.day ? `${showDay ? dateLabel(item.day) + " · " : ""}${item.time || "Date only"}` : "Unscheduled"}</p>
          </div>
        </div>
        </Fragment>
      ))}
      {!items.length && <p className="s-muted">{room ?? "No items match these filters."}</p>}
      <BudgetPagination page={current} pages={pages} onPage={setPage} />
    </div>
  );
}

export function CalendarWorkspace({
  items, timezone, today, day, setDay, view, setView, importOpen, setImportOpen, importer, onPlan, ready,
}: {
  items: CalendarItem[]; timezone: string; today: string; day: string; setDay: (day: string) => void;
  view: CalendarView; setView: (view: CalendarView) => void;
  importOpen: boolean; setImportOpen: (value: boolean) => void; importer: ReactNode;
  onPlan?: (day: string) => void; ready?: ReactNode;
}) {
  const importDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>();
  const detail = items.find(item => item.id === selected);
  const close = () => detailDialog.current?.close();
  useEffect(() => {
    const dialog = importDialog.current;
    if (importOpen && !dialog?.open) dialog?.showModal();
    if (!importOpen && dialog?.open) dialog.close();
  }, [importOpen]);
  function inspect(item: CalendarItem) {
    setSelected(item.id);
    detailDialog.current?.showModal();
  }
  const first = day.slice(0, 7) + "-01";
  const monthEnd = atNoon(first);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const offset = atNoon(first).getUTCDay();
  const gridStart = addDays(first, -offset);
  const gridDays = 7 * Math.ceil((offset + (+monthEnd - +atNoon(first)) / 86400000) / 7);
  const weekStart = addDays(day, -((atNoon(day).getUTCDay() + 6) % 7));
  const weekEnd = addDays(weekStart, 6);
  const pipeline = view === "Pipeline Intake";
  const month = view === "Month & Day Agenda";
  const statuses = [...new Set(items.filter(item => !pipeline || item.kind === "Imported brief").map(item => item.status))].sort();
  const visible = items.filter(item =>
    (pipeline ? item.kind === "Imported brief" : !type || item.kind === type) &&
    (!status || status === item.status) &&
    item.title.toLowerCase().includes(search.trim().toLowerCase()),
  ).sort((a, b) => (a.day ?? "9999").localeCompare(b.day ?? "9999") ||
    (a.timeOrder ?? "").localeCompare(b.timeOrder ?? "") || a.title.localeCompare(b.title));
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of visible) {
    if (!item.day) continue;
    const group = byDay.get(item.day) ?? [];
    group.push(item);
    byDay.set(item.day, group);
  }
  const thisWeek = visible.filter(item => item.day && item.day >= weekStart && item.day <= weekEnd);
  const rowKey = `${view}:${day}:${type}:${status}:${search}`;
  const importedMonths = [...new Set(items.filter(item => item.kind === "Imported brief" && item.day)
    .map(item => item.day!.slice(0, 7)))].sort();
  function shift(delta: number) {
    if (!month) return setDay(addDays(day, delta * 7));
    const date = atNoon(first);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setDay(iso(date));
  }

  return (
    <section className="s-cal-workspace" aria-label="Calendar workspace">
      <nav className="s-create-tabs" aria-label="Calendar views">
        {views.map(option => <button key={option} type="button" className="s-btn" aria-pressed={view === option}
          onClick={() => { setType(""); setStatus(""); setSearch(""); setView(option); }}>{option}</button>)}
        <button type="button" className="s-btn" onClick={() => setImportOpen(true)}>Import calendar</button>
      </nav>
      <div className="s-cal-toolbar">
        {!pipeline && <div className="s-actions">
          <button type="button" className="s-btn" aria-label={month ? "Previous month" : "Previous week"} onClick={() => shift(-1)}>‹</button>
          <h2>{month ? monthLabel(day) : `${dateLabel(weekStart)} – ${dateLabel(weekEnd)}`}</h2>
          <button type="button" className="s-btn" aria-label={month ? "Next month" : "Next week"} onClick={() => shift(1)}>›</button>
          <button type="button" className="s-btn" onClick={() => setDay(today)}>Today</button>
        </div>}
        <span className="s-muted">{timezone}</span>
      </div>
      <div className="s-cal-filters">
        <label>Search {pipeline ? "briefs" : "calendar"}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
        {!pipeline && <label>Work type<select value={type} onChange={event => setType(event.target.value)}>
          <option value="">All work types</option>{kinds.map(kind => <option key={kind}>{kind}</option>)}
        </select></label>}
        <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All statuses</option>{statuses.map(status => <option key={status}>{status}</option>)}
        </select></label>
        {!pipeline && importedMonths.length > 0 && <label>Jump to imported month
          <select value="" onChange={event => {
            const period = event.target.value;
            if (!period) return;
            const firstBrief = items.filter(item => item.kind === "Imported brief" && item.day?.startsWith(period))
              .map(item => item.day!).sort()[0];
            setDay(firstBrief ?? period + "-01");
          }}>
            <option value="">Choose a month</option>
            {importedMonths.map(value => <option key={value} value={value}>{monthLabel(value + "-01")}</option>)}
          </select>
        </label>}
      </div>
      {month && <div className="s-cal-month-layout">
        <div className="s-cal-month" aria-label="Month calendar">
          {weekdays.map(name => <span key={name}>{name}</span>)}
          {Array.from({ length: gridDays }, (_, index) => {
            const date = addDays(gridStart, index);
            const count = byDay.get(date)?.length ?? 0;
            return <button className="s-btn s-cal-day" type="button" key={date}
              data-other-month={!date.startsWith(first.slice(0, 7))} aria-current={date === today ? "date" : undefined}
              aria-pressed={day === date} aria-label={`${dateLabel(date)}, ${count} items`} onClick={() => setDay(date)}>
              <strong>{Number(date.slice(-2))}</strong>{count > 0 && <small>{count} {count === 1 ? "item" : "items"}</small>}
            </button>;
          })}
        </div>
        <aside className="s-cal-lane" aria-label="Selected day agenda">
          <h3>{dateLabel(day)}</h3>
          <CalendarList key={rowKey} items={byDay.get(day) ?? []} size={5} inspect={inspect} room="No work on this day." />
          {onPlan && <button type="button" className="s-btn" onClick={() => onPlan(day)}>Plan on this day</button>}
        </aside>
      </div>}
      {view === "Weekly Agenda" && <section className="s-cal-lane" aria-label="Weekly agenda">
        <CalendarList key={rowKey} items={thisWeek} size={8} groupByDay inspect={inspect} room="No work this week." />
      </section>}
      {view === "Workflow Planner" && <div className="s-cal-lanes">
        {kinds.slice(0, 4).filter(kind => !type || type === kind).map(kind => <section key={kind} className="s-cal-lane" aria-label={kind}>
          <h3>{kind}</h3><CalendarList key={rowKey} items={thisWeek.filter(item => item.kind === kind)} size={4} showDay inspect={inspect} />
        </section>)}
        {type === "Imported brief" && <p>Open Pipeline Intake to manage imported briefs.</p>}
      </div>}
      {pipeline && <div className="s-cal-lanes">
        <section className="s-cal-lane" aria-label="Needs a date">
          <h3>Needs a date</h3><CalendarList key={rowKey} items={visible.filter(item => !item.day)} size={6} inspect={inspect} />
        </section>
        <section className="s-cal-lane" aria-label="Dated briefs">
          <h3>Dated briefs</h3><CalendarList key={rowKey} items={visible.filter(item => item.day)} size={6} showDay inspect={inspect} />
        </section>
      </div>}
      {ready}
      <dialog ref={detailDialog} className="s-review-dialog s-cal-dialog" aria-label="Calendar item">
        <div className="s-review-dialog-heading"><h2>{detail?.title ?? "Calendar item"}</h2>
          <button type="button" className="s-btn" onClick={close}>Close</button></div>
        {detail && <div className="s-review-dialog-body">
          <p>{detail.channel} · {detail.kind} · {detail.status}</p>
          <p>{detail.day ? `${dateLabel(detail.day)} · ${detail.time || "Date only"}` : "Unscheduled"}</p>
          {detail.notes && <p className="s-cal-notes">{detail.notes}</p>}
          {detail.publicationUrl && <a href={detail.publicationUrl} target="_blank" rel="noreferrer">View publication ↗</a>}
          <div className="s-actions">
            <button type="button" className="s-btn" onClick={() => { close(); detail.onOpen(); }}>{detail.openLabel}</button>
            {detail.actions?.(close)}
          </div>
        </div>}
      </dialog>
      <dialog ref={importDialog} className="s-review-dialog s-cal-dialog" aria-label="Import calendar" onClose={() => setImportOpen(false)}>
        <div className="s-review-dialog-heading"><h2>Import calendar</h2><button type="button" className="s-btn"
          onClick={() => setImportOpen(false)}>Close</button></div>
        {!!importOpen && <div className="s-review-dialog-body">{importer}</div>}
      </dialog>
    </section>
  );
}
