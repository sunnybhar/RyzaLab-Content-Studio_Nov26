"use client";

import { useEffect, useState, type ReactNode } from "react";

type Template = { id: string; name: string };
type Library = { templates: Template[]; selected: string | null };
const endpoint = "/api/studio/local/newsletter";

async function checked(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Newsletter template request failed.");
  }
  return response;
}

export function NewsletterTemplateExport({
  contentId, title, text, children,
}: {
  contentId: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  const [library, setLibrary] = useState<Library>({ templates: [], selected: null });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const libraryUrl = `${endpoint}?contentId=${encodeURIComponent(contentId)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(libraryUrl, { signal: controller.signal, cache: "no-store" })
      .then(checked).then((response) => response.json())
      .then(setLibrary)
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
    const result = await (await checked(await fetch(endpoint, {
      method: "POST", body: form, signal: AbortSignal.timeout(60000),
    }))).json();
    setLibrary(await (await checked(await fetch(libraryUrl, { cache: "no-store" }))).json());
    setMessage(result.added ? `${result.added} template${result.added === 1 ? "" : "s"} added.` : "These templates are already in Studio.");
  }

  async function choose(templateId: string) {
    const result = await (await checked(await fetch(endpoint, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, templateId: templateId || null }),
      signal: AbortSignal.timeout(15000),
    }))).json();
    setLibrary((previous) => ({ ...previous, selected: result.selected }));
  }

  async function download(format: "pdf" | "docx") {
    const response = await checked(await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: library.selected, title, text, format }),
      signal: AbortSignal.timeout(75000),
    }));
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (title.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 100) || "newsletter") + "." + format;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="s-version" aria-label="Newsletter template">
      <h3>Newsletter template</h3>
      <label className="s-field">
        Upload Word templates
        <input type="file" multiple accept=".docx" disabled={busy || loading}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files || []);
            event.currentTarget.value = "";
            if (files.length) void perform(() => upload(files));
          }} />
      </label>
      <label className="s-field">
        Template for this newsletter
        <select value={library.selected ?? ""} disabled={busy || loading}
          onChange={(event) => void perform(() => choose(event.target.value))}>
          <option value="">Standard layout</option>
          {library.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {library.selected ? (
        <>
          <div className="s-actions">
            <button type="button" className="s-btn" disabled={busy || !text.trim()} onClick={() => void perform(() => download("docx"))}>Download newsletter DOCX</button>
            <button type="button" className="s-btn s-primary" disabled={busy || !text.trim()} onClick={() => void perform(() => download("pdf"))}>Download newsletter PDF</button>
          </div>
          <p>Uses the Word template’s embedded cover and styles. PDF export uses LibreOffice installed on this computer.</p>
        </>
      ) : children}
    </section>
  );
}
