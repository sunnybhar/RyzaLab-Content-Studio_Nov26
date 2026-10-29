"use client";
import { useRef, useState } from "react";
import {
  FUNCTIONS,
  type Connection,
  type Command,
  type FunctionKind,
} from "@/lib/studio/types";
export function ConnectionEditor({
  connection,
  initialFunction = "text",
  save,
  discover,
  demo,
  disabled = false,
}: {
  connection?: Connection;
  initialFunction?: FunctionKind;
  save: (command: Command) => Promise<unknown>;
  discover: (input: Record<string, unknown>) => Promise<string[]>;
  demo: boolean;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<Connection["provider"]>("anthropic");
  const [kind, setKind] = useState<FunctionKind>(initialFunction);
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open() {
    setTitle(connection?.title || "");
    setProvider(connection?.provider || "anthropic");
    setKind(connection?.function || initialFunction);
    setModel(connection?.model || "");
    setKey("");
    setModels([]);
    setError("");
    dialog.current?.showModal();
  }
  return (
    <>
      <button className="s-btn" disabled={disabled} onClick={open}>
        {connection ? "Edit connection" : `Set up ${initialFunction}`}
      </button>
      <dialog
        ref={dialog}
        className="s-review-dialog"
        aria-label={connection ? "Edit AI connection" : "Set up AI connection"}
        onClose={() => setKey("")}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header className="s-review-dialog-heading">
          <h2>{connection ? "Edit AI connection" : "Set up AI connection"}</h2>
          <button
            className="s-btn"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </header>
        <form
          className="s-review-dialog-body"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await save({
                type: "connection.save",
                ...(connection
                  ? {
                      id: connection.id,
                      expectedUpdatedAt: connection.updatedAt,
                    }
                  : {}),
                title,
                provider,
                function: kind,
                model,
                ...(key ? { key } : {}),
              });
              dialog.current?.close();
              setKey("");
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not save connection.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="s-field">
            Connection name
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="s-field">
            Function
            <select
              value={kind}
              disabled={busy || !!connection}
              onChange={(e) => setKind(e.target.value as FunctionKind)}
            >
              {FUNCTIONS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="s-field">
            Provider
            <select
              value={provider}
              disabled={busy}
              onChange={(e) => {
                setProvider(e.target.value as Connection["provider"]);
                setModels([]);
                setModel("");
                setKey("");
              }}
            >
              {[
                ["anthropic", "Claude (Anthropic)"],
                ["openai", "OpenAI"],
                ["google", "Gemini (Google)"],
              ].map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="s-field">
            {connection &&
            provider === connection.provider &&
            connection.hasKey &&
            connection.status !== "disconnected"
              ? "API key — leave blank to keep stored key"
              : "API key"}
            <input
              type="password"
              autoComplete="new-password"
              value={key}
              required={
                !demo &&
                (!connection ||
                  provider !== connection.provider ||
                  !connection.hasKey ||
                  connection.status === "disconnected")
              }
              disabled={busy}
              onChange={(e) => {
                setKey(e.target.value);
                setModels([]);
              }}
            />
          </label>
          <button
            type="button"
            className="s-btn"
            disabled={busy || demo}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setModels(
                  await discover({
                    provider,
                    function: kind,
                    ...(key ? { key } : { connectionId: connection?.id }),
                  }),
                );
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not load models.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Load account models
          </button>
          <label className="s-field">
            Model identifier
            <select
              value={models.includes(model) ? model : ""}
              disabled={busy || !models.length}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="">Select an account model</option>
              {models.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
            <input
              required
              value={model}
              disabled={busy}
              pattern="[A-Za-z0-9_.:/\-]{1,150}"
              placeholder="Or enter exact API model ID"
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          <p>
            Model access is separate from supported functions and verified
            pricing. Image, audio and video generation remain pending
            qualification. Saving requires a fresh model-access check.
          </p>
          {demo && <p>Demo saves metadata only. API keys are discarded.</p>}
          {error && (
            <p className="s-alert s-error" role="alert">
              {error}
            </p>
          )}
          <button className="s-btn s-primary" disabled={busy}>
            {busy ? "Working…" : "Save connection"}
          </button>
        </form>
      </dialog>
    </>
  );
}
