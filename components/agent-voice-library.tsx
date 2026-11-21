"use client";
import { useRef, useState } from "react";
import type { Actor, Channel, Command, StudioState } from "@/lib/studio/types";
import { voiceArchiveEntries, voiceArchiveText, voiceDocumentLimit } from "@/lib/studio/voice-archive";
import { can } from "@/lib/studio/permissions";
export function AgentVoiceLibrary({
  state,
  actor,
  channel,
  send,
  local = false,
  entryId,
}: {
  state: StudioState;
  actor: Actor;
  channel: Channel;
  local?: boolean;
  entryId?: string;
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
    (e) => e.id === entryId && (e.channel === "Shared" || e.channel === channel),
  );
  function change() {
    pending.current = undefined;
    setMessage("");
  }
  async function importArchive(archive: File) {
    setBusy(true);
    setError("");
    setMessage("");
    let saved = 0;
    const skipped: string[] = [];
    try {
      for await (const entry of voiceArchiveEntries(archive, local)) {
        try {
          if (!entry.bytes) throw new Error(entry.error);
          const { fileName, bytes } = entry;
          const defaultTitle = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Original content";
          let title = defaultTitle, text: string | undefined;
          let file: { fileName: string; byteSize: number; base64: string } | undefined;
          let archivePdf: Blob | undefined;
          if (/\.(?:docx|pdf)$/i.test(fileName)) {
            if (local && /\.pdf$/i.test(fileName) && bytes.length > voiceDocumentLimit) {
              archivePdf = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
            } else {
              const chunks: string[] = [];
              for (let offset = 0; offset < bytes.length; offset += 8192)
                chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
              file = { fileName, byteSize: bytes.length, base64: btoa(chunks.join("")) };
            }
          } else {
            const document = voiceArchiveText(fileName, bytes);
            title = document.title || title;
            text = document.text;
            if (!text || text.length > 60000)
              throw new Error("Use readable text of at most 60,000 characters.");
          }
          const meta = new TextEncoder().encode(JSON.stringify([target, contentType, title, fileName]));
          const fingerprint = new Uint8Array(meta.length + bytes.length);
          fingerprint.set(meta);
          fingerprint.set(bytes, meta.length);
          const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", fingerprint));
          const requestKey = "archive:" + Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
          await send({ type: "agentVoice.create", title: title.slice(0, 200), contentType, channel: target, text, file, requestKey, ...(archivePdf ? {archivePdf} : {}) });
          saved++;
        } catch (cause) {
          skipped.push(`${entry.fileName}: ${cause instanceof Error ? cause.message : "Could not save."}`);
        }
      }
      setMessage(`${saved} voice example${saved === 1 ? "" : "s"} imported or already saved.`);
      if (skipped.length) setError(`Skipped ${skipped.length} document${skipped.length === 1 ? "" : "s"}. ${skipped.join(" ")}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open this ZIP.");
    } finally {
      setBusy(false);
    }
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
      className="s-rule-form"
      aria-label="RyzaLab tone and original content voice"
    >
      {!entryId && <>
      <p>
        Collect original articles, posts and newsletters as future examples of
        voice, tone, structure and format. Add multiple examples by pasting text
        or uploading files. New AI requests use up to six latest matching channel or shared examples, up to 2,000 characters each.
      </p>
      <label className="s-field">
        Import posts from ZIP
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={!allowed || busy}
          onChange={(event) => {
            const archive = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (archive) void importArchive(archive);
          }}
        />
      </label>
      <p>Each document becomes one voice example using the content type and brand-wide setting below. Media files are skipped. {local && "Local ZIP imports extract text from PDFs up to 128 MB."}</p>
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
      </>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {examples.map((entry) => (
        <article className="s-version" key={entry.id}>
          <h3>{entry.title}</h3>
          <p>
            {entry.contentType} ·{" "}
            {entry.channel === "Shared" ? "Brand-wide" : entry.channel} · Stored
            for new AI requests
          </p>
          {entry.file && <button className="s-btn" onClick={() => download(entry)}>Download original file</button>}
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
