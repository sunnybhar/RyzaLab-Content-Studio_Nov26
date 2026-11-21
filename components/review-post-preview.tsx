"use client";

import { useState, type ComponentType } from "react";
import { newsletterStructureIssue, type NewsletterSection } from "@/lib/studio/newsletter-outline";
import type { Content } from "@/lib/studio/types";
import { downloadTemplatedNewsletter, newsletterRequest } from "./newsletter-template-export";
import { PostPreview } from "./post-preview";

export function ReviewPostPreview({
  content, local, hosted = false, AssetMedia, returnToDraft, onFormatExport,
}: {
  content: Content;
  local: boolean;
  hosted?: boolean;
  onFormatExport: (templateId: string) => Promise<string>;
  returnToDraft?: () => Promise<boolean>;
  AssetMedia: ComponentType<{ source: string; kind?: "image" | "video" | "audio" }>;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [returning, setReturning] = useState(false);
  const { id, title, text, channel, format, account, media } = content;
  const newsletter = (local || hosted) && channel === "Newsletter";

  async function downloadWord() {
    setDownloading(true);
    setError("");
    try {
      const response = await newsletterRequest(local, `?contentId=${encodeURIComponent(id)}`,
        { signal: AbortSignal.timeout(15000) });
      const { selected, outline } = await response.json() as { selected: string | null; outline?: NewsletterSection[] };
      if (!selected) throw new Error("Select a Word template for this newsletter in Create.");
      const formatted = newsletterStructureIssue(outline ?? [], text) ? await onFormatExport(selected) : text;
      await downloadTemplatedNewsletter(id, selected, title, formatted, "docx", hosted ? content.revision : undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not download this newsletter.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="s-actions">
        {newsletter && (
          <button type="button" className="s-btn s-primary" disabled={downloading || !text.trim()} onClick={() => void downloadWord()}>
            {downloading ? "Preparing Word document…" : "Download newsletter DOCX"}
          </button>
        )}
        <button type="button" className="s-btn" onClick={() => setOpen(true)}>
          {newsletter ? "Show reading preview" : "Preview post"}
        </button>
      </div>
      {error && (
        <div className="s-alert s-error" role="alert">
          <p>{error}</p>
          {returnToDraft && (
            <button type="button" className="s-btn" disabled={returning} onClick={async () => {
              setReturning(true);
              try {
                if (!await returnToDraft()) setError("Could not return this newsletter to draft. Refresh and try again.");
              } finally {
                setReturning(false);
              }
            }}>
              {returning ? "Returning to draft…" : "Return to draft to fix template"}
            </button>
          )}
        </div>
      )}
      {open && <PostPreview title={title} text={text} account={account} channel={channel} format={format}
        media={media} unsaved={false} AssetMedia={AssetMedia} onClose={() => setOpen(false)} />}
    </>
  );
}
