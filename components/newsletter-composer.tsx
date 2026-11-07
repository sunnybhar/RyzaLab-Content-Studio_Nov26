"use client";
import { useRef, useState } from "react";
import type { Command, StudioState } from "@/lib/studio/types";
import type { NewsletterInput } from "@/lib/studio/newsletter-bundle";
export function NewsletterComposer({
  state,
  send,
  open,
  disabled,
  demo,
}: {
  state: StudioState;
  send: (command: Command) => Promise<{ state: StudioState }>;
  open: (id: string) => void;
  disabled: boolean;
  demo: boolean;
}) {
  const requestKey = useRef(crypto.randomUUID());
  const [selected, setSelected] = useState<string[]>([]),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [outline, setOutline] = useState(""),
    [search, setSearch] = useState(""),
    [documents, setDocuments] = useState<NewsletterInput[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const choices = [
    ...state.contents
      .filter((c) => !c.deletedAt)
      .map((c) => ({
        key: "content:" + c.id,
        title: c.title,
        label: `${c.channel} · ${c.format}`,
        input: {
          kind: "content",
          id: c.id,
          expectedRevision: c.revision,
        } as NewsletterInput,
      })),
    ...state.ideas
      .filter((i) => i.state !== "rejected")
      .map((i) => ({
        key: "idea:" + i.id,
        title: i.title,
        label: `Idea · ${i.channel}`,
        input: { kind: "idea", id: i.id } as NewsletterInput,
      })),
    ...(state.pipelineBriefs || []).map((p) => ({
      key: "pipeline:" + p.id,
      title: p.title,
      label: "Existing Pipeline",
      input: { kind: "pipeline", id: p.id } as NewsletterInput,
    })),
  ];
  const sources = choices
    .filter((c) => selected.includes(c.key))
    .map((c) => c.input);
  const count = sources.length + documents.length + (text.trim() ? 1 : 0);
  async function upload(files: FileList | null) {
    if (!files) return;
    setError("");
    setBusy(true);
    try {
      const added: NewsletterInput[] = [];
      for (const file of Array.from(files)) {
        if (
          !/\.(pdf|docx|md|txt)$/i.test(file.name) ||
          file.size > 262144 ||
          !file.size
        )
          throw Error("Use PDF/DOCX/MD/TXT files up to 256 KB each.");
        if (demo && !/\.(md|txt)$/i.test(file.name))
          throw Error(
            "PDF/DOCX extraction needs live Studio. In preview, paste text or upload MD/TXT.",
          );
        const base64 = btoa(
          Array.from(new Uint8Array(await file.arrayBuffer()), (c) =>
            String.fromCharCode(c),
          ).join(""),
        );
        added.push({
          kind: "document",
          file: { fileName: file.name, byteSize: file.size, base64 },
          extractedText: /\.(md|txt)$/i.test(file.name)
            ? await file.text()
            : undefined,
        });
      }
      if (documents.length + added.length > 2)
        throw Error("Choose at most two uploaded documents per newsletter.");
      setDocuments([...documents, ...added]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function compose() {
    setBusy(true);
    setError("");
    try {
      const result = await send({
        type: "newsletter.compose",
        title,
        outline,
        sources: [
          ...sources,
          ...documents,
          ...(text.trim()
            ? [
                {
                  kind: "text" as const,
                  title: "Pasted reference material",
                  text,
                },
              ]
            : []),
        ],
        requestKey: requestKey.current,
      });
      const draft = result.state.contents.find(
        (c) => c.newsletterRequestKey === requestKey.current,
      );
      if (!draft?.newsletterSources)
        throw Error(
          "Newsletter was not confirmed. Check Create before trying again.",
        );
      open(draft.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="s-version"
      style={{ marginTop: 24, marginBottom: 24, padding: 20 }}
    >
      <summary>Combine sources into a newsletter</summary>
      <p>
        Select old posts, ideas and pipeline briefs from any channel. Add pasted
        text or searchable PDF/DOCX documents. Review the outline, then open a
        saved draft. This action does not call AI.
      </p>
      {error && <p role="alert">{error}</p>}
      <label className="s-field">
        Newsletter title
        <input
          aria-label="Combined newsletter title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="s-field">
        Find source material
        <input
          aria-label="Find newsletter sources"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div
        style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 12 }}
      >
        {choices
          .filter(
            (c) =>
              !search || c.title.toLowerCase().includes(search.toLowerCase()),
          )
          .map((choice) => (
            <label key={choice.key}>
              <input
                type="checkbox"
                checked={selected.includes(choice.key)}
                disabled={busy || disabled}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, choice.key]
                      : selected.filter((key) => key !== choice.key),
                  )
                }
              />{" "}
              {choice.title} · {choice.label}
            </label>
          ))}
      </div>
      <label className="s-field">
        Additional pasted material
        <textarea
          aria-label="Newsletter pasted sources"
          maxLength={30000}
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label className="s-field">
        Upload newsletter source documents
        <input
          aria-label="Newsletter source documents"
          type="file"
          multiple
          accept=".pdf,.docx,.md,.txt"
          disabled={busy || disabled}
          onChange={(e) => {
            void upload(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {documents.map(
        (d, i) =>
          d.kind === "document" && (
            <p key={i}>
              {d.file.fileName}{" "}
              <button
                className="s-btn"
                disabled={busy}
                onClick={() =>
                  setDocuments(documents.filter((_, index) => index !== i))
                }
              >
                Remove {d.file.fileName}
              </button>
            </p>
          ),
      )}
      <button
        className="s-btn"
        disabled={busy || disabled || !count}
        onClick={() =>
          setOutline(
            [
              "Opening: connect the selected themes to the reader’s problem.",
              ...choices
                .filter((c) => selected.includes(c.key))
                .map((c) => `Story: ${c.title}`),
              ...documents.map((d) =>
                d.kind === "document" ? `Story: ${d.file.fileName}` : "",
              ),
              ...(text.trim() ? ["Story: additional pasted material"] : []),
              "Analysis: compare findings, limitations and practical implications.",
              "Close: useful next action and sources.",
            ].join("\n"),
          )
        }
      >
        Create outline from selected sources
      </button>
      <label className="s-field">
        Combined outline — edit before writing
        <textarea
          aria-label="Combined newsletter outline"
          value={outline}
          maxLength={12000}
          rows={8}
          onChange={(e) => setOutline(e.target.value)}
        />
      </label>
      <p>
        {count}/10 sources · Source snapshots and original documents stay with
        the draft. Uploaded guidance is reference material, not verified facts.
      </p>
      <button
        className="s-btn s-primary"
        disabled={
          disabled ||
          busy ||
          !title.trim() ||
          !outline.trim() ||
          count < 1 ||
          count > 10
        }
        onClick={() => void compose()}
      >
        {busy ? "Saving sources…" : "Save outline and open newsletter"}
      </button>
    </details>
  );
}
