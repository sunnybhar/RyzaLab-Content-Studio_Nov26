"use client";

import { DraftGenerationProgress } from "./draft-generation-progress";
import { useEffect, useState, type ReactNode } from "react";

import { newsletterStructureIssue, type NewsletterSection } from "@/lib/studio/newsletter-outline";

type Template = { id: string; name: string };
type Library = { templates: Template[]; selected: string | null; outline: NewsletterSection[] };
export const newsletterTemplateEndpoint = "/api/studio/local/newsletter";

export async function checkedNewsletterResponse(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Newsletter template request failed.");
  }
  return response;
}

export function newsletterFilename(title: string, format: "pdf" | "docx") {
  return (title.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 100) || "newsletter") + "." + format;
}

export async function downloadTemplatedNewsletter(contentId: string, templateId: string, title: string, text: string, format: "pdf" | "docx") {
  const response = await checkedNewsletterResponse(await fetch(newsletterTemplateEndpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, templateId, title, text, format }),
    signal: AbortSignal.timeout(75000),
  }));
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = newsletterFilename(title, format);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NewsletterTemplateExport({
  contentId, title, text, children, onAdapt, generationBusy, adaptingSince, adaptDisabled, draftDirty, savingDraft, adaptError, unsavedImage,
}: {
  contentId: string;
  title: string;
  text: string;
  children: ReactNode;
  onAdapt: () => void;
  generationBusy: boolean;
  adaptingSince?: number;
  adaptDisabled: boolean;
  draftDirty: boolean;
  savingDraft: boolean;
  adaptError?: string;
  unsavedImage: boolean;
}) {
  const [library, setLibrary] = useState<Library>({ templates: [], selected: null, outline: [] });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const structureIssue = library.selected && text.trim() ? newsletterStructureIssue(library.outline, text) : undefined;
  const libraryUrl = `${newsletterTemplateEndpoint}?contentId=${encodeURIComponent(contentId)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(libraryUrl, { signal: controller.signal, cache: "no-store" })
      .then(checkedNewsletterResponse).then((response) => response.json())
      .then((next) => { setLibrary(next); setLibraryLoaded(true); })
      .catch((cause) => { if (!controller.signal.aborted) setError(String(cause.message)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [libraryUrl]);

  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Newsletter template request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: File[]) {
    const form = new FormData();
    for (const file of files) form.append("template", file);
    const result = await (await checkedNewsletterResponse(await fetch(newsletterTemplateEndpoint, {
      method: "POST", body: form, signal: AbortSignal.timeout(60000),
    }))).json();
    setLibrary(await (await checkedNewsletterResponse(await fetch(libraryUrl, { cache: "no-store" }))).json());
    setLibraryLoaded(true);
    setMessage(result.added ? `${result.added} template${result.added === 1 ? "" : "s"} added.` : "These templates are already in Studio.");
  }

  async function choose(templateId: string) {
    await checkedNewsletterResponse(await fetch(newsletterTemplateEndpoint, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, templateId: templateId || null }),
      signal: AbortSignal.timeout(15000),
    }));
    setLibrary(await (await checkedNewsletterResponse(await fetch(libraryUrl, { cache: "no-store" }))).json());
  }


  return (
    <section className="s-version" aria-label="Newsletter template">
      <h3>Newsletter template</h3>
      <label className="s-field">
        Upload Word templates
        <input type="file" multiple accept=".docx" disabled={busy || loading || generationBusy}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files || []);
            event.currentTarget.value = "";
            if (files.length) void perform(() => upload(files));
          }} />
      </label>
      <label className="s-field">
        Template for this newsletter
        <select value={library.selected ?? ""} disabled={busy || loading || generationBusy}
          onChange={(event) => void perform(() => choose(event.target.value))}>
          <option value="">Standard layout</option>
          {library.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {loading ? <p role="status">Loading newsletter template…</p> : library.selected ? (
        <>
          {!text.trim() && (
            <button type="button" className="s-btn" disabled={busy || generationBusy || adaptDisabled} onClick={onAdapt}>
              {adaptingSince != null ? (savingDraft ? "Saving draft…" : "Writing with template…") : draftDirty ? "Save draft and write with this template" : "Write with this template"}
            </button>
          )}
          {adaptingSince != null && <DraftGenerationProgress label={savingDraft ? "Saving draft…" : "Writing with this template…"} startedAt={adaptingSince} />}
          {adaptError && <p role="alert">{adaptError}</p>}
          {library.outline.length > 0 && (
            <details>
              <summary>Template sections</summary>
              <ol>{library.outline.map(({ heading, columns }, index) => (
                <li key={index}>{heading}{columns && ` · table: ${columns.join(", ")}`}</li>
              ))}</ol>
            </details>
          )}
          {structureIssue && <p>Export keeps your existing section order and applies the template’s cover and styles. Matching sections and tables use the template’s layout.</p>}
          <div className="s-actions">
            <button type="button" className="s-btn" disabled={busy || generationBusy || unsavedImage || !text.trim()} onClick={() => void perform(() => downloadTemplatedNewsletter(contentId, library.selected!, title, text, "docx"))}>Download newsletter DOCX</button>
            <button type="button" className="s-btn s-primary" disabled={busy || generationBusy || unsavedImage || !text.trim()} onClick={() => void perform(() => downloadTemplatedNewsletter(contentId, library.selected!, title, text, "pdf"))}>Download newsletter PDF</button>
          </div>
          {unsavedImage && <p role="status">Save the draft to export changes to the main image.</p>}
          <p>Export includes the template cover and the saved Studio main image. PDF export uses LibreOffice.</p>
        </>
      ) : libraryLoaded ? children : null}
    </section>
  );
}
