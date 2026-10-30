"use client";
import { useState } from "react";
export function FounderSetup({
  request,
  changed,
  demo,
}: {
  request: (
    body?: unknown,
  ) => Promise<{
    eligible?: boolean;
    founderExists?: boolean;
    configured?: boolean;
    version?: number;
  }>;
  changed: () => Promise<void>;
  demo: boolean;
}) {
  const [status, setStatus] = useState<{
    eligible?: boolean;
    founderExists?: boolean;
    configured?: boolean;
    version?: number;
  }>();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="s-panel">
      <div className="s-section-heading">
        <div>
          <h2>First-founder setup</h2>
          <p>
            Enable founder controls for the deployment-designated owner. This
            does not change budgets or start AI work.
          </p>
        </div>
        <button
          className="s-btn"
          disabled={busy || demo}
          onClick={async () => {
            setBusy(true);
            setError("");
            setConfirmed(false);
            try {
              setStatus(await request());
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not check founder setup.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Check founder setup
        </button>
      </div>
      {demo && (
        <p>First-founder setup is available only in the live workspace.</p>
      )}
      {status?.founderExists ? (
        <p>
          A founder is already recorded. Ask the existing founder to manage
          founder access; this setup cannot replace them.
        </p>
      ) : status && !status.eligible ? (
        <p>
          {status.configured
            ? "This account is not the deployment-designated administrator."
            : "The deployment owner must set the server-only STUDIO_FOUNDER_EMAIL to the intended founder’s verified sign-in email, then redeploy."}
        </p>
      ) : null}
      {status?.eligible && (
        <div>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I am the designated owner and accept founder responsibility for
            protected rules and release decisions.
          </label>
          <p>
            <button
              className="s-btn s-primary"
              disabled={busy || !confirmed}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await request({
                    expectedVersion: status.version,
                    acknowledge: true,
                  });
                  await changed();
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not confirm founder setup.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm founder role
            </button>
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="s-alert s-error">
          {error}
        </p>
      )}
    </section>
  );
}
