"use client";

import type { Command, Content, Job } from "@/lib/studio/types";
import { supabase } from "@/lib/supabase";
import { DraftGenerationProgress } from "./draft-generation-progress";
import { useEffect, useState, type ReactNode } from "react";

import { newsletterStructureIssue, type NewsletterSection } from "@/lib/studio/newsletter-outline";

type Template = { id: string; name: string };
type FormatJob = Pick<Job, "id" | "state" | "outputStatus" | "error">;
type Library = { templates: Template[]; selected: string | null; outline: NewsletterSection[]; formatJob?: FormatJob };
export const newsletterTemplateEndpoint = "/api/studio/local/newsletter";

export async function checkedNewsletterResponse(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Newsletter template request failed.");
  }
  return response;
}

export async function newsletterRequest(local: boolean, query = "", init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!local) {
    const { data } = await supabase!.auth.getSession();
    if (!data.session) throw new Error("Sign in to use newsletter templates.");
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return checkedNewsletterResponse(await fetch((local ? newsletterTemplateEndpoint : "/api/studio/newsletter") + query, {
    ...init, headers, cache: "no-store",
  }));
}

export function newsletterFilename(title: string, format: "pdf" | "docx") {
  return (title.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 100) || "newsletter") + "." + format;
}

export async function downloadTemplatedNewsletter(contentId: string, templateId: string, title: string, text: string, format: "pdf" | "docx", hostedRevision?: number) {
  const response = await newsletterRequest(hostedRevision === undefined, "", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hostedRevision === undefined ? { contentId, templateId, title, text, format } :
      { contentId, templateId, expectedRevision: hostedRevision, format }),
    signal: AbortSignal.timeout(75000),
  });
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = newsletterFilename(title, format);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function prepareNewsletterExport(send: (command: Command) => Promise<unknown>, draft: Content, templateId: string) {
  const result = await send({
    type: "content.generate", contentId: draft.id, kind: "text", expectedRevision: draft.revision,
    idempotencyKey: crypto.randomUUID(), newsletterExportTemplateId: templateId,
  }) as { job?: Job };
  if (result.job?.outputStatus !== "ready" || !result.job.candidate?.body)
    throw new Error("Studio could not format this newsletter for download. The saved draft is still available.");
  return result.job.candidate.body;
}

export async function prepareHostedNewsletterExport(send: (command: Command) => Promise<unknown>, draft: Content, templateId: string) {
  const query = `?contentId=${encodeURIComponent(draft.id)}`;
  const library: Library = await (await newsletterRequest(false, query)).json();
  if (library.selected !== templateId) throw new Error("The selected template changed. Refresh before exporting.");
  let job = library.formatJob;
  if (job?.state === "succeeded" && job.outputStatus === "ready") return;
  if (!job || !["queued", "running", "awaiting_confirmation", "unknown"].includes(job.state)) {
    const idempotencyKey = crypto.randomUUID();
    const result = await send({
      type: "content.generate", contentId: draft.id, expectedRevision: draft.revision, kind: "text",
      newsletterExportTemplateId: templateId, idempotencyKey,
    }) as { state: { jobs: Job[] } };
    job = result.state.jobs.find(item => item.idempotencyKey === idempotencyKey && item.contentId === draft.id);
  }
  if (!job) throw new Error("Check Generation activity for the saved formatting request.");
  for (let attempt = 0; attempt < 30; attempt++) {
    if (job.state === "succeeded" && job.outputStatus === "ready") return;
    if (job.state === "awaiting_confirmation") throw new Error("Confirm the formatting request in Generation activity, then download again.");
    if (job.state !== "queued" && job.state !== "running")
      throw new Error(job.error || "The formatting request could not produce an export. Check Generation activity.");
    await new Promise(resolve => setTimeout(resolve, 4000));
    job = await (await newsletterRequest(false, query + `&jobId=${encodeURIComponent(job.id)}`,
      { signal: AbortSignal.timeout(15000) })).json() as FormatJob;
  }
  throw new Error("Formatting is still running. Download again after it finishes in Generation activity.");
}

export function NewsletterTemplateExport({
  local = true, revision, selectionDisabled = false, onTemplateChange, contentId, title, text, children, onAdapt, generationBusy, adaptingSince, adaptDisabled, draftDirty, savingDraft, adaptError, unsavedImage, onFormatExport,
}: {
  local?: boolean;
  revision?: number;
  selectionDisabled?: boolean;
  onTemplateChange?: () => Promise<void>;
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
  onFormatExport: (templateId: string) => Promise<string>;
}) {
  const [library, setLibrary] = useState<Library>({ templates: [], selected: null, outline: [] });
  const [busy, setBusy] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const structureIssue = library.selected && text.trim() ? newsletterStructureIssue(library.outline, text) : undefined;
  const libraryQuery = `?contentId=${encodeURIComponent(contentId)}`;

  useEffect(() => {
    const controller = new AbortController();
    newsletterRequest(local, libraryQuery, { signal: controller.signal })
      .then((response) => response.json())
      .then((next) => { setLibrary(next); setLibraryLoaded(true); })
      .catch((cause) => { if (!controller.signal.aborted) setError(String(cause.message)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [local, libraryQuery]);

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
    let added = 0;
    for (const batch of local ? [files] : files.map(file => [file])) {
      const form = new FormData();
      if (!local) form.append("contentId", contentId);
      for (const file of batch) form.append("template", file);
      const result = await (await newsletterRequest(local, "", {
        method: "POST", body: form, signal: AbortSignal.timeout(60000),
      })).json();
      added += Number(result.added);
    }
    setLibrary(await (await newsletterRequest(local, libraryQuery)).json());
    setLibraryLoaded(true);
    setMessage(added ? `${added} template${added === 1 ? "" : "s"} added.` : "These templates are already in Studio.");
  }

  async function choose(templateId: string) {
    await newsletterRequest(local, "", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, templateId: templateId || null, expectedRevision: revision }),
      signal: AbortSignal.timeout(15000),
    });
    setLibrary(await (await newsletterRequest(local, libraryQuery)).json());
    await onTemplateChange?.();
  }


  async function download(format: "docx" | "pdf") {
    if (!library.selected) return;
    setFormatting(Boolean(structureIssue));
    try {
      const formatted = structureIssue ? await onFormatExport(library.selected) : text;
      await downloadTemplatedNewsletter(contentId, library.selected, title, formatted, format, local ? undefined : revision);
    } finally {
      setFormatting(false);
    }
  }

  return (
    <section className="s-version" aria-label="Newsletter template">
      <h3>Newsletter template</h3>
      <label className="s-field">
        Upload Word templates
        <input type="file" multiple accept=".docx" disabled={busy || loading || generationBusy || selectionDisabled}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files || []);
            event.currentTarget.value = "";
            if (files.length) void perform(() => upload(files));
          }} />
      </label>
      <label className="s-field">
        Template for this newsletter
        <select value={library.selected ?? ""} disabled={busy || loading || generationBusy || selectionDisabled}
          onChange={(event) => void perform(() => choose(event.target.value))}>
          <option value="">Standard layout</option>
          {library.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      {!local && <p className="s-muted">Hosted templates support Word downloads. Upload DOCX files up to 4 MB each.</p>}
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
          {formatting && <DraftGenerationProgress label="Formatting newsletter for download…" />}
          {library.outline.length > 0 && (
            <details>
              <summary>Template sections</summary>
              <ol>{library.outline.map(({ heading, columns }, index) => (
                <li key={index}>{heading}{columns && ` · table: ${columns.join(", ")}`}</li>
              ))}</ol>
            </details>
          )}
          {structureIssue && <p>Studio will adapt the existing copy to the template’s sections and tables for the download. This uses your writing connection and keeps the editor draft intact.</p>}
          <div className="s-actions">
            <button type="button" className="s-btn" disabled={busy || generationBusy || unsavedImage || Boolean((!local || structureIssue) && draftDirty) || !text.trim()} onClick={() => void perform(() => download("docx"))}>Download newsletter DOCX</button>
            {local && <button type="button" className="s-btn s-primary" disabled={busy || generationBusy || unsavedImage || Boolean(structureIssue && draftDirty) || !text.trim()} onClick={() => void perform(() => download("pdf"))}>Download newsletter PDF</button>}
          </div>
          {(!local || structureIssue) && draftDirty && <p role="status">Save the draft before formatting it for download.</p>}
          {unsavedImage && <p role="status">Save the draft to export changes to the main image.</p>}
          <p>Export includes the template cover and the saved Studio main image.{local && " PDF export uses LibreOffice."}</p>
        </>
      ) : libraryLoaded ? children : null}
    </section>
  );
}
