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
        <h2>v0.3.30 · Broader research and writing resources</h2><p>New research excludes Wikipedia, prioritizes configured sectors and source preferences, and attempts bounded article reading. Source cards distinguish accessible text from search excerpts. Agent Rules now offers Humanizer, research preferences and long-form structure/layout resources with saved versions. Supported structured layout settings apply to PDF/DOCX exports. The full deep-research, image-generation and automatic correction backlog remains unfinished.</p><h3>v0.3.29 · Recoverable saves and clearer review workflow</h3><p>Draft saves retain an operation receipt and a local working copy, reconcile lost acknowledgements, and preserve typing during saves or conflicts. Confirmed review submission returns to Create with a Reviews action. Source ideas and briefs can be reused across channels without merging their output drafts. Write as offers Blog and Newsletter formats with distinct reading targets. Reviews history shows the latest ten publications or month-filtered records with exact-package previews; approval is separate from publication. Section spacing and maximum-cost wording are clearer. The remaining consolidated backlog, including deeper research, image generation and publishing integrations, is still in progress.</p><h3>v0.3.28 · Calendar import and Existing Pipeline</h3><p>Download an Excel template or upload your existing XLSX calendar, map its columns and review valid rows, dates, destinations and duplicates. Imported titles and angles become linked calendar briefs and Existing Pipeline choices in both Ideas and Create. Generate ideas, add one manually or write a LinkedIn/newsletter draft directly. Original source copy, links and brief versions stay with the draft. Historical approvals remain notes; importing never runs AI or publishes. Duplicate updates default to skip and cannot replace a linked draft.</p><h3>v0.3.27 · Interrupted writing recovery</h3><p>Writing checks for an encrypted saved outcome before asking for another AI call. Completed outcomes can settle their own expired lease without replacing later edits or reconciled billing. When an older response cannot be recovered, explicitly start a new writing attempt; the earlier unknown outcome and reservation remain recorded and all spending limits still apply. Worker database calls now have bounded waits.</p><h3>v0.3.26 · Ideas inbox, board and table</h3><p>Choose a request on the left and organise its ideas through New ideas, Shortlisted and Ready to write on the right. Switch to Table view for the same ideas and saved stages. Request dates, original topics, sources, incomplete results and manual ideas stay connected. Card moves are planning decisions; they do not run AI, approve content or publish it.</p><h3>v0.3.25 · Cleaner workspace and Ideas options</h3><p>The active channels are LinkedIn, Instagram, YouTube, Reddit and Newsletter. The title bar names RyzaLab Content Studio; workspace controls move below Manage in the sidebar. Ideas show request dates, original briefs and stable request numbers, without raw provider responses. Compare four interactive layout previews from Ideas before choosing the final layout. Editor support tools collapse under More options, and writing shows which saved Agent Rules were included.</p><h3>v0.3.24 · One review decision</h3><p>Submit content once. Automatic checks prepare in the background within the existing allowance. Review the content and choose Approve &amp; publish, or use a manual override with a reason when checks are delayed or need attention. Copy approval tabs and the nine-stage manual checklist are removed. Approval opens copy/download controls directly. Publishing remains manual; the app does not claim it sent your content to a platform.</p><h3>v0.3.23 · Studio timeouts and database error clarity</h3><p>The main Studio API now requests a 180-second execution window instead of 60 seconds. Database timeouts and access failures are distinguished from missing migrations. Safe phase/timing logs help diagnose interrupted requests, and timeout responses explain that the outcome needs checking rather than being automatically retried.</p><h3>v0.3.22 · Exact review blockers and next actions</h3><p>The review window identifies pending writing or review requests directly, including status, request ID and errors. Confirm or run an existing saved request, cancel only undispatched work, or record a verified uncertain outcome with administrator permission. Final approval still requires a current review report and human approval.</p><h3>v0.3.21 · Download directly below newsletter content</h3><p>PDF and DOCX exports now sit directly below the content box and use its current text automatically. Images are optional, with an include-image choice when one is attached. The old newsletter image/export panel has been removed.</p><h3>v0.3.20 · Recover complete saved ideas</h3><p>When an idea response hits its output limit, recover only fully written saved cards as pending ideas without another AI call. View the raw response directly from Ideas; impossible full-batch imports are hidden. Future idea requests use compact stage-specific instructions and check batch size against the qualified output allowance.</p><h3>v0.3.19 · Bounded idea and writing context</h3><p>Large workflow references and uploaded guidance now fit the existing input allowance through local source-labelled excerpt selection. Protected rules, Instructions and your task remain complete. New jobs freeze the exact context that was priced. Request errors appear directly in the progress panel with truthful stages.</p><h3>v0.3.18 · Download original uploads</h3><p>Agent Rules retains exact original channel and skill ZIP uploads for verification, showing filename, size and upload time. Original downloads remain separate from the edited saved-package ZIP. Earlier uploads need one re-upload to retain the original archive. The Mac metadata save fix is included.</p><h3>v0.3.17 · Mac ZIP package saves</h3><p>Agent Rules ignores macOS metadata files that could corrupt previews and prevent database saves. The original START-HERE instructions filename is accepted without renaming. Invalid binary text is rejected before saving with a clear error.</p><h3>v0.3.16 · Editable rule packages and illustrated newsletters</h3><p>Upload channel ZIP packages, preview/edit both sections, and add skill guidance or knowledge files before saving. New newsletter drafts target 1,200–1,600 words with sources and an image brief; Write shows progress and image-inclusive PDF/DOCX exports. Existing workspaces need one model-setup refresh for the larger qualified writing allowance.</p><h3>v0.3.15 · Connected Agent Rules and broader source discovery</h3>
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
