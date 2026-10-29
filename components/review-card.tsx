"use client";
import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function ReviewCard({
  title,
  channel,
  revision,
  children,
}: {
  title: string;
  channel: string;
  revision: number;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  return (
    <article className="s-panel s-review-card">
      <div className="s-review-row">
        <div>
          <span className="s-muted">
            {channel} · Revision {revision} · Review requested
          </span>
          <h2>{title}</h2>
        </div>
        <button
          className="s-btn s-primary"
          onClick={() => dialog.current?.showModal()}
        >
          Open review
        </button>
      </div>
      <dialog
        ref={dialog}
        className="s-review-dialog"
        aria-labelledby={heading}
      >
        <header className="s-review-dialog-heading">
          <h2 id={heading}>Review post</h2>
          <button
            className="s-icon-button"
            aria-label="Close review"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </header>
        <div className="s-review-dialog-body">{children}</div>
      </dialog>
    </article>
  );
}
