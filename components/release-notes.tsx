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
        <h2>v0.3.7 · Bounded public research</h2>
        <p>
          In Ideas or Create → Write, open Web research → Find public
          references. Retrieve limited Wikipedia extracts and Crossref scholarly
          abstracts, inspect the source links, then select evidence for ideas or
          writing.
        </p>
        <p>
          This source retrieval needs no separate Research key and makes no paid
          model call. It is limited reference coverage; it does not search
          unrestricted news or confirm personal experience. Existing spending
          limits remain enforced.
        </p>
        <p>
          Next builds: simplified Claude setup, sample verification, then
          detailed cost reporting.
        </p>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close build notes
        </button>
      </dialog>
    </>
  );
}
