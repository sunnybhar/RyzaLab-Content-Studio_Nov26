"use client";
import { useEffect, useState } from "react";
import type { Content, Command } from "@/lib/studio/types";
import {
  confirmationMarkers,
  inputRequirements,
} from "@/lib/studio/input-requirements";
import { HighlightedTextarea } from "./highlighted-textarea";

function MarkedCopy({ text }: { text: string }) {
  let end = 0;
  const parts = confirmationMarkers(text).flatMap((marker, i) => {
    const before = text.slice(end, marker.start);
    end = marker.end;
    return [before, <mark key={i}>{marker.text}</mark>];
  });
  return (
    <>
      {parts}
      {text.slice(end)}
    </>
  );
}

export function ReviewContentEditor({
  content,
  canEdit,
  send,
  onEditing,
  openDraft,
}: {
  content: Content;
  canEdit: boolean;
  send: (command: Command) => Promise<unknown>;
  onEditing: (editing: boolean) => void;
  openDraft: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [text, setText] = useState(content.text),
    [notes, setNotes] = useState(content.metadata),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setText(content.text);
    setNotes(content.metadata);
    setEditing(false);
    onEditing(false);
  }, [content.revision]);
  const required = inputRequirements({ ...content, text, metadata: notes });
  function edit(value: boolean) {
    setEditing(value);
    onEditing(value);
    setError("");
    if (!value) {
      setText(content.text);
      setNotes(content.metadata);
    }
  }
  return (
    <section aria-label="Review content">
      <p>
        {editing
          ? "Edit the post below, answer the highlighted questions, then save and submit."
          : "Read the post. Use Edit content to make changes, then approve the copy below."}
      </p>
      {editing ? (
        <HighlightedTextarea
          aria-label="Review post text"
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <div className="s-review-copy" style={{ whiteSpace: "pre-wrap" }}>
          <MarkedCopy
            text={
              content.text ||
              "No written text. Review the attached media below."
            }
          />
        </div>
      )}
      {required.length > 0 && (
        <div className="s-input-required" role="status">
          <strong>
            {required.length} {required.length === 1 ? "answer" : "answers"}{" "}
            needed before submission or approval.
          </strong>
          <p>
            Replace highlighted markers with verified details or rewrite the
            unsupported passage. Questions in publication notes are available
            below.
          </p>
        </div>
      )}
      <div className="s-actions">
        {editing ? (
          <>
            <button
              className="s-btn"
              disabled={busy}
              onClick={() => edit(false)}
            >
              Cancel editing
            </button>
            <button
              className="s-btn s-primary"
              disabled={busy || required.length > 0}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await send({
                    type: "content.reviewEdit",
                    id: content.id,
                    expectedRevision: content.revision,
                    text,
                    metadata: notes,
                  });
                  edit(false);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Changes could not be submitted.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save and submit"}
            </button>
          </>
        ) : (
          <button
            className="s-btn s-primary"
            disabled={!canEdit}
            onClick={() => edit(true)}
          >
            Edit content
          </button>
        )}
        <button className="s-text-button" disabled={busy} onClick={openDraft}>
          Open full editor for media
        </button>
      </div>
      {(notes || editing) && (
        <details className="s-version">
          <summary>
            Publication notes (optional)
            {confirmationMarkers(notes).length ? " · needs input" : ""}
          </summary>
          {editing ? (
            <HighlightedTextarea
              rows={4}
              aria-label="Review publication notes"
              value={notes}
              disabled={busy}
              onChange={(e) => setNotes(e.target.value)}
            />
          ) : (
            <div style={{ whiteSpace: "pre-wrap" }}>
              <MarkedCopy text={notes} />
            </div>
          )}
        </details>
      )}
      {error && (
        <p role="alert" className="s-red-text">
          {error}
        </p>
      )}
    </section>
  );
}
