"use client";
import { useRef } from "react";
export function ReleaseNotes() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="s-btn s-small-btn"
        onClick={() => dialog.current?.showModal()}
      >
        What’s new
      </button>
      <dialog
        ref={dialog}
        className="s-panel s-panel-padding"
        aria-label="What changed in this build"
        style={{ maxWidth: 600, width: "calc(100% - 32px)", margin: "auto" }}
      >
        <h2>v0.3.10 · LinkedIn and Newsletter samples</h2>
        <p>AI &amp; budgets now prepares three AI idea/content samples and two blank manual exercises. LinkedIn comes first, followed by Newsletter adaptations. Continue an earlier first-sample run without repeating its paid calls.</p>
        <p>Already authorized idea, writing and review jobs can progress while Studio is open, using the existing worker lease and budget checks. The two human approvals and manual publication handoff remain required.</p>
        <p>Manual exercises need your own writing. Real live sample completion has not been asserted by this build. Detailed token usage and cost reporting follows in the final build.</p>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close build notes
        </button>
      </dialog>
    </>
  );
}
