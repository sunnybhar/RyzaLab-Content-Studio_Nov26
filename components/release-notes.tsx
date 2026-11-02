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
        <h2>v0.3.12 · Saved setup and clearer settings</h2>
        <p>
          AI &amp; budgets now has space between sections. Each section starts
          collapsed; click its heading to show the settings and explanatory
          content.
        </p>
        <p>
          The LinkedIn and Newsletter checkbox now reflects your saved channel
          connections when you return or reload. An unsaved selection tells you
          to click Check model and enable bounded workflow before leaving.
        </p>
        <details>
          <summary>Changes in the earlier builds</summary>
          <ul>
            <li>
              <strong>v0.3.11:</strong> Token usage, recorded costs,
              reservations and remaining post allowance.
            </li>
            <li>
              <strong>v0.3.7:</strong> Bounded public references in Ideas and
              Create, with selectable source excerpts.
            </li>
            <li>
              <strong>v0.3.8:</strong> Reuse a stored Claude writing key for
              ideas, writing and review; explicit token limits.
            </li>
            <li>
              <strong>v0.3.9:</strong> First LinkedIn sample dashboard with
              source inspection and an editor/review link.
            </li>
            <li>
              <strong>v0.3.10:</strong> Three AI and two manual exercises,
              Newsletter adaptation, continuation and authorized review
              progression.
            </li>
          </ul>
        </details>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close build notes
        </button>
      </dialog>
    </>
  );
}
