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
        <h2>v0.3.16 · Editable rule packages and illustrated newsletters</h2><p>Upload channel ZIP packages, preview/edit both sections, and add skill guidance or knowledge files before saving. New newsletter drafts target 1,200–1,600 words with sources and an image brief; Write shows progress and image-inclusive PDF/DOCX exports. Existing workspaces need one model-setup refresh for the larger qualified writing allowance.</p><h3>v0.3.15 · Connected Agent Rules and broader source discovery</h3>
        <p>LinkedIn has separate Instructions and Markdown context uploads with downloadable templates. New idea, writing and review requests use saved channel rules and up to six voice examples. Existing jobs retain their original context. The channel setup checkbox can be edited and its saved choice persists. Research now also attempts web and news source discovery; results show search excerpts and links with coverage gaps.</p>
        <h3>v0.3.14 · Visible progress and editable recovered drafts</h3>
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
