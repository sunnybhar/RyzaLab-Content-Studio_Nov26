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
        <h2>v0.3.24 · One review decision</h2><p>Submit content once. Automatic checks prepare in the background within the existing allowance. Review the content and choose Approve &amp; publish, or use a manual override with a reason when checks are delayed or need attention. Copy approval tabs and the nine-stage manual checklist are removed. Approval opens copy/download controls directly. Publishing remains manual; the app does not claim it sent your content to a platform.</p><h3>v0.3.23 · Studio timeouts and database error clarity</h3><p>The main Studio API now requests a 180-second execution window instead of 60 seconds. Database timeouts and access failures are distinguished from missing migrations. Safe phase/timing logs help diagnose interrupted requests, and timeout responses explain that the outcome needs checking rather than being automatically retried.</p><h3>v0.3.22 · Exact review blockers and next actions</h3><p>The review window identifies pending writing or review requests directly, including status, request ID and errors. Confirm or run an existing saved request, cancel only undispatched work, or record a verified uncertain outcome with administrator permission. Final approval still requires a current review report and human approval.</p><h3>v0.3.21 · Download directly below newsletter content</h3><p>PDF and DOCX exports now sit directly below the content box and use its current text automatically. Images are optional, with an include-image choice when one is attached. The old newsletter image/export panel has been removed.</p><h3>v0.3.20 · Recover complete saved ideas</h3><p>When an idea response hits its output limit, recover only fully written saved cards as pending ideas without another AI call. View the raw response directly from Ideas; impossible full-batch imports are hidden. Future idea requests use compact stage-specific instructions and check batch size against the qualified output allowance.</p><h3>v0.3.19 · Bounded idea and writing context</h3><p>Large workflow references and uploaded guidance now fit the existing input allowance through local source-labelled excerpt selection. Protected rules, Instructions and your task remain complete. New jobs freeze the exact context that was priced. Request errors appear directly in the progress panel with truthful stages.</p><h3>v0.3.18 · Download original uploads</h3><p>Agent Rules retains exact original channel and skill ZIP uploads for verification, showing filename, size and upload time. Original downloads remain separate from the edited saved-package ZIP. Earlier uploads need one re-upload to retain the original archive. The Mac metadata save fix is included.</p><h3>v0.3.17 · Mac ZIP package saves</h3><p>Agent Rules ignores macOS metadata files that could corrupt previews and prevent database saves. The original START-HERE instructions filename is accepted without renaming. Invalid binary text is rejected before saving with a clear error.</p><h3>v0.3.16 · Editable rule packages and illustrated newsletters</h3><p>Upload channel ZIP packages, preview/edit both sections, and add skill guidance or knowledge files before saving. New newsletter drafts target 1,200–1,600 words with sources and an image brief; Write shows progress and image-inclusive PDF/DOCX exports. Existing workspaces need one model-setup refresh for the larger qualified writing allowance.</p><h3>v0.3.15 · Connected Agent Rules and broader source discovery</h3>
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
