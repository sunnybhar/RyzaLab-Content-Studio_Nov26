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
        <h2>v0.3.9 · First LinkedIn sample</h2>
        <p>
          In AI &amp; budgets, open First live LinkedIn sample. Prepare one
          researched idea and LinkedIn draft, then inspect its content and
          source excerpts in one place.
        </p>
        <p>
          The dashboard advances its authorized jobs while open. It reuses
          existing permission, budget and execution-lease checks, stops after
          uncertainty, and never approves or publishes content. Server provider
          execution and the worker token must be configured.
        </p>
        <p>
          Next: the remaining LinkedIn and Newsletter sample exercises. Detailed
          usage and cost reporting remain last. A deployed dashboard does not
          mean a live sample has already passed.
        </p>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close build notes
        </button>
      </dialog>
    </>
  );
}
