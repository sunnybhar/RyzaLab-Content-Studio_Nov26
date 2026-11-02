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
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close build notes
        </button>
      </dialog>
    </>
  );
}
