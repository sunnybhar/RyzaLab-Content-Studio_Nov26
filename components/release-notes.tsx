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
        <h2>v0.3.14 · Visible progress and editable recovered drafts</h2>
        <p>Idea generation shows research, allowance, generation and results stages at the top. Public queries include the audience and exclude unrelated references. Incomplete writing can be recovered into an empty editor without another AI call; it remains marked unfinished until edited.</p>
        <h3>v0.3.13 · Researched ideas and stored Agent Rules</h3>
        <p>
          Generate ideas now retrieves public research automatically and shows
          idea cards with source websites and excerpts in the same window. Add
          manually includes its own research and AI-development action; applying
          a proposal remains your choice. Saved evidence carries into writing.
        </p>
        <p>
          Agent Rules adds per-channel Instructions and Context file slots, plus
          a RyzaLab original-content voice library for pasted articles, posts
          and newsletters or uploaded files. All Agent Rules and voice examples
          are stored only and are not connected to generation yet.
        </p>
        <details>
          <summary>Changes in the earlier builds</summary>
          <ul>
            <li>
              <strong>v0.3.12:</strong> Saved setup display and spaced,
              collapsed AI &amp; budgets sections.
            </li>
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
