"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

type BudgetTab = { title: string; content: ReactNode };

export function SpendingDashboard({
  summary,
  sections,
}: {
  summary?: ReactNode;
  sections: BudgetTab[];
}) {
  const id = useId();
  const [selected, setSelected] = useState("Spending");
  const index = Math.max(0, sections.findIndex(section => section.title === selected));
  const active = sections[index];

  function navigate(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const offsets: Record<string, number> = {
      ArrowLeft: (current + sections.length - 1) % sections.length,
      ArrowRight: (current + 1) % sections.length,
      Home: 0,
      End: sections.length - 1,
    };
    const next = offsets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setSelected(sections[next].title);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <div className="s-budget-layout">
      {summary}
      <div className="s-budget-tabs" role="tablist" aria-label="AI & budgets sections">
        {sections.map(({ title }, i) => (
          <button className="s-btn" key={title} type="button" role="tab"
            id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`}
            aria-selected={i === index} tabIndex={i === index ? 0 : -1}
            onClick={() => setSelected(title)} onKeyDown={event => navigate(event, i)}>
            {title}
          </button>
        ))}
      </div>
      {sections.map(({ title }, i) => (
        <div role="tabpanel" key={title} hidden={i !== index}
          id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`}>
          {i === index && active.content}
        </div>
      ))}
    </div>
  );
}

export function BudgetPagination({
  page, pages, onPage,
}: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="s-budget-pagination">
      <span role="status">Page {page + 1} of {pages}</span>
      <div className="s-actions">
        <button type="button" className="s-btn s-small-btn" disabled={!page} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="s-btn s-small-btn" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function BudgetPagedList({ rows }: { rows: ReactNode[] }) {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  return (
    <>
      {rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize)}
      <BudgetPagination page={currentPage} pages={pages} onPage={setPage} />
    </>
  );
}
