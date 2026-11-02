"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
/** Closed sections mount no setup forms or sample-progress effects. */
export function BudgetSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="s-budget-section s-panel"
      data-budget-section={title}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      {open && <div className="s-budget-section-body">{children}</div>}
    </details>
  );
}
