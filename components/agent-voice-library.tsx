"use client";
import { useRef, useState } from "react";
import type { Actor, Channel, Command, StudioState } from "@/lib/studio/types";
import { can } from "@/lib/studio/permissions";
export function AgentVoiceLibrary({
  state,
  actor,
  channel,
  send,
}: {
  state: StudioState;
  actor: Actor;
  channel: Channel;
  send: (command: Command) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(""),
    [contentType, setContentType] = useState<"article" | "post" | "newsletter">(
      "post",
    ),
    [source, setSource] = useState("paste"),
    [text, setText] = useState(""),
    [file, setFile] = useState<File>(),
    [shared, setShared] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const pending = useRef<string | undefined>(undefined),
    fileInput = useRef<HTMLInputElement>(null);
  const target = shared ? "Shared" : channel,
    allowed = can(state, actor, "workflow.edit", {
      channel: shared ? undefined : channel,
    });
  const examples = (state.agentVoiceExamples || []).filter(
    (e) => e.channel === "Shared" || e.channel === channel,
  );
  function change() {
    pending.current = undefined;
    setMessage("");
  }
  function download(
    entry: NonNullable<StudioState["agentVoiceExamples"]>[number],
  ) {
    if (!entry.file) return;
    const bytes = Uint8Array.from(atob(entry.file.base64), (char) =>
        char.charCodeAt(0),
      ),
      url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = entry.file.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="s-agent-voice-library s-panel s-panel-padding"
      aria-label="RyzaLab tone and original content voice"
    >
      <h2>RyzaLab tone and original content voice</h2>
      <p>
        Collect original articles, posts and newsletters as future examples of
        voice, tone, structure and format. Add multiple examples by pasting text
        or uploading files. New AI requests use up to six latest matching channel or shared examples, up to 2,000 characters each.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            pending.current ??= crypto.randomUUID();
            let stored;
            if (source === "file") {
              if (
                !file ||
                file.size < 1 ||
                file.size > 262144 ||
                !/\.(docx|pdf|md|txt)$/i.test(file.name)
              )
                throw new Error(
                  "Choose a nonempty DOCX, PDF, TXT or Markdown file up to 256 KB.",
                );
              const bytes = new Uint8Array(await file.arrayBuffer());
              let binary = "";
              for (const byte of bytes) binary += String.fromCharCode(byte);
              stored = {
                fileName: file.name,
                byteSize: file.size,
                base64: btoa(binary),
              };
            }
            await send({
              type: "agentVoice.create",
              title: title.trim(),
              contentType,
              channel: target,
              text: source === "paste" ? text : undefined,
              file: stored,
              requestKey: pending.current,
            });
            setTitle("");
            setText("");
            setFile(undefined);
            if (fileInput.current) fileInput.current.value = "";
            pending.current = undefined;
            setMessage(
              "Original content example saved. Connected to new idea and writing requests.",
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not save the example.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="s-field">
          Example title
          <input
            aria-label="Voice example title"
            value={title}
            maxLength={200}
            required
            disabled={busy}
            onChange={(e) => {
              setTitle(e.target.value);
              change();
            }}
          />
        </label>
        <label className="s-field">
          Content type
          <select
            aria-label="Voice example content type"
            value={contentType}
            disabled={busy}
            onChange={(e) => {
              setContentType(e.target.value as typeof contentType);
              change();
            }}
          >
            <option value="article">Article</option>
            <option value="post">Post</option>
            <option value="newsletter">Newsletter</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={shared}
            disabled={busy}
            onChange={(e) => {
              setShared(e.target.checked);
              change();
            }}
          />{" "}
          Brand-wide example (otherwise saved for {channel} only)
        </label>
        <label className="s-field">
          Add example by
          <select
            aria-label="Voice example source"
            value={source}
            disabled={busy}
            onChange={(e) => {
              setSource(e.target.value);
              change();
            }}
          >
            <option value="paste">Copy and paste text</option>
            <option value="file">Upload a file</option>
          </select>
        </label>
        {source === "paste" ? (
          <label className="s-field">
            Original content
            <textarea
              aria-label="Original voice example content"
              rows={8}
              maxLength={60000}
              required
              value={text}
              disabled={busy}
              onChange={(e) => {
                setText(e.target.value);
                change();
              }}
            />
          </label>
        ) : (
          <label className="s-field">
            Original content file
            <input
              ref={fileInput}
              aria-label="Voice example file"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              required
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                change();
              }}
            />
          </label>
        )}
        <button className="s-btn" disabled={busy || !allowed} type="submit">
          {busy ? "Saving…" : "Save original content example"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <p>
        {examples.length} example(s) available for {channel}, including
        brand-wide examples. Pasted text: up to 60,000 characters. Files: up to
        256 KB each. The library supports up to 100 examples within workspace
        storage limits.
      </p>
      {examples.map((entry) => (
        <article className="s-version" key={entry.id}>
          <h3>{entry.title}</h3>
          <p>
            {entry.contentType} ·{" "}
            {entry.channel === "Shared" ? "Brand-wide" : entry.channel} · Stored
            for new AI requests
          </p>
          {entry.text && (
            <details>
              <summary>Read original content</summary>
              <p style={{ whiteSpace: "pre-wrap" }}>{entry.text}</p>
            </details>
          )}
          {entry.file && (
            <>
              <p>{entry.file.fileName}</p>
              <button className="s-btn" onClick={() => download(entry)}>
                Download original file
              </button>
            </>
          )}
          <button
            className="s-btn"
            disabled={
              busy ||
              !can(state, actor, "workflow.edit", {
                channel: entry.channel === "Shared" ? undefined : entry.channel,
              })
            }
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await send({ type: "agentVoice.remove", id: entry.id });
                setMessage("Original content example removed.");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not remove example.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove example
          </button>
        </article>
      ))}
    </section>
  );
}
