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
        <h2>v0.3.11 · Usage and cost visibility</h2>
        <p>
          AI &amp; budgets generation activity and the sample dashboard now show
          recorded input/output tokens, usage-priced cost, held reservations and
          remaining post allowance.
        </p>
        <p>
          Supported uncached Claude token usage settles at qualified USD rates,
          rounded up to cents. Missing or unsupported usage keeps its
          reservation. These figures are not invoices. If reported usage exceeds
          its quote envelope, the job requires reconciliation before another
          paid attempt.
        </p>
        <p>
          The five-build workflow is implemented. Live Claude and manual sample
          acceptance still need actual testing in the deployed workspace; local
          fixtures do not prove live success.
        </p>
        <details>
          <summary>Changes in the earlier builds</summary>
          <ul>
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
