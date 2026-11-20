"use client";
import { useEffect, useRef, useState } from "react";
import type { Command, StudioState } from "@/lib/studio/types";
import type { NewsletterInput } from "@/lib/studio/newsletter-bundle";
const sourceGroups = [
  { id: "pipeline", label: "Pipeline briefs" },
  { id: "idea", label: "Ideas" },
  { id: "content", label: "Past posts and drafts" },
] as const;

export function NewsletterComposer({
  state,
  send,
  open,
  disabled,
  demo,
  initialSource,
  startOpen = false,
}: {
  state: StudioState;
  send: (command: Command) => Promise<{ state: StudioState }>;
  open: (id: string) => void;
  disabled: boolean;
  demo: boolean;
  initialSource?: string;
  startOpen?: boolean;
}) {
  const requestKey = useRef(crypto.randomUUID());
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (initialSource) panel.current?.scrollIntoView({ block: "start" });
  }, [initialSource]);
  const [selected, setSelected] = useState<string[]>(initialSource ? [initialSource] : []),
    [group, setGroup] = useState(sourceGroups.find(({ id }) => initialSource?.startsWith(id + ":"))?.id ?? "pipeline"),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [outline, setOutline] = useState(""),
    [search, setSearch] = useState(""),
    [documents, setDocuments] = useState<NewsletterInput[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const published = new Set(state.schedules.filter((schedule) => schedule.state === "published").map((schedule) => schedule.contentId));
  const choices = [
    ...state.contents
      .filter((c) => !c.deletedAt)
      .map((c) => ({
        key: "content:" + c.id,
        title: c.title,
        label: `${c.channel} · ${published.has(c.id) ? "Previously published" : c.state === "draft" ? "Draft" : c.state}`,
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
      label: [p.channel, p.plannedDate].filter(Boolean).join(" · "),
      input: { kind: "pipeline", id: p.id } as NewsletterInput,
    })),
  ];
  const chosen = selected.flatMap((key) => choices.find((choice) => choice.key === key) ?? []);
  const count = chosen.length + documents.length + (text.trim() ? 1 : 0);
  const visibleChoices = choices.filter((choice) => choice.input.kind === group &&
    choice.title.toLowerCase().includes(search.trim().toLowerCase()));
  function buildOutline() {
    return [
      "Opening: connect the selected themes to the reader’s problem.",
      ...chosen.map((choice) => `Story: ${choice.title}`),
      ...documents.flatMap((document) => document.kind === "document" ? [`Story: ${document.file.fileName}`] : []),
      ...(text.trim() ? ["Story: additional pasted material"] : []),
      "Analysis: compare findings, limitations and practical implications.",
      "Close: useful next action and sources.",
    ].join("\n");
  }
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
        outline: outline.trim() || buildOutline(),
        sources: [
          ...chosen.map((choice) => choice.input),
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
      ref={panel}
      open={startOpen || Boolean(initialSource) || undefined}
      className="s-version"
      style={{ marginTop: 24, marginBottom: 24, padding: 20 }}
    >
      <summary>Combine sources into a newsletter</summary>
      <p>
        Choose 2–10 sources for one Brand Newsletter. You can mix pipeline briefs,
        ideas, drafts and published posts from any channel.
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
      <div className="s-actions" role="group" aria-label="Newsletter source type">
        {sourceGroups.map(({ id, label }) => (
          <button key={id} type="button" className={id === group ? "s-btn s-primary" : "s-btn"}
            aria-pressed={id === group} onClick={() => setGroup(id)}>
            {label} ({chosen.filter((choice) => choice.input.kind === id).length} selected)
          </button>
        ))}
      </div>
      <div role="group" aria-label={sourceGroups.find(({ id }) => id === group)?.label}
        style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 12 }}>
        {!visibleChoices.length && <p>No matching sources in this group.</p>}
        {visibleChoices.map((choice) => (
          <label key={choice.key}>
            <input type="checkbox" checked={selected.includes(choice.key)}
              disabled={busy || disabled || (count >= 10 && !selected.includes(choice.key))}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelected((current) => checked ? [...current, choice.key] : current.filter((key) => key !== choice.key));
              }}
            />{" "}
            {choice.title} · {choice.label}
          </label>
        ))}
      </div>
      {chosen.length > 0 && (
        <details className="s-version">
          <summary>Selected Studio sources ({chosen.length})</summary>
          <ul>{chosen.map((choice) => (
            <li key={choice.key}>{choice.title}{" "}
              <button type="button" className="s-btn" disabled={busy || disabled}
                aria-label={`Remove ${choice.title}`}
                onClick={() => setSelected((current) => current.filter((key) => key !== choice.key))}>
                Remove
              </button>
            </li>
          ))}</ul>
        </details>
      )}
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
        onClick={() => setOutline(buildOutline())}
      >
        Create outline from selected sources
      </button>
      <label className="s-field">
        Combined outline (optional)
        <span className="s-muted">Studio creates an outline from your selected sources if you leave this blank.</span>
        <textarea
          aria-label="Combined newsletter outline"
          value={outline}
          maxLength={12000}
          rows={8}
          onChange={(e) => setOutline(e.target.value)}
        />
      </label>
      <p>
        {count} of 10 sources selected. {count < 2 ? "Select at least two to continue." : "The draft will open in Create."}
      </p>
      <button
        className="s-btn s-primary"
        disabled={
          disabled ||
          busy ||
          !title.trim() ||
          count < 2 ||
          count > 10
        }
        onClick={() => void compose()}
      >
        {busy ? "Saving sources…" : "Create Brand Newsletter draft"}
      </button>
    </details>
  );
}
