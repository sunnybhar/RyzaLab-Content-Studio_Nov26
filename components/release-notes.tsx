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
        <h2>v0.3.8 · Simplified Claude workflow</h2>
        <p>
          In AI &amp; budgets, open Bounded research and writing. Select your
          stored Claude Sonnet 5.5 Text connection and click Check model and
          enable bounded workflow. No extra Research key is needed.
        </p>
        <p>
          Setup checks model input/output bounds, saves tool-free
          idea/writing/review pricing, and enables workspace defaults. It
          preserves monthly and per-post budgets and explicit channel mappings.
          One shared provider gives a second review pass; independent-review
          requirements remain enforced.
        </p>
        <p>
          In Ideas or Create, retrieve public references, inspect and select
          excerpts, then generate with Claude. Your keys stay in Studio. Next:
          sample verification dashboard; detailed cost reporting follows last.
        </p>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close build notes
        </button>
      </dialog>
    </>
  );
}
