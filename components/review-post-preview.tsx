"use client";

import { useState, type ComponentType } from "react";
import type { Content } from "@/lib/studio/types";
import { checkedNewsletterResponse, downloadTemplatedNewsletter, newsletterTemplateEndpoint } from "./newsletter-template-export";
import { PostPreview } from "./post-preview";

export function ReviewPostPreview({
  content, local, AssetMedia,
}: {
  content: Content;
  local: boolean;
  AssetMedia: ComponentType<{ source: string; kind?: "image" | "video" | "audio" }>;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const { id, title, text, channel, format, account, media } = content;
  const newsletter = local && channel === "Newsletter";

  async function downloadWord() {
    setDownloading(true);
    setError("");
    try {
      const response = await checkedNewsletterResponse(await fetch(
        `${newsletterTemplateEndpoint}?contentId=${encodeURIComponent(id)}`,
        { cache: "no-store", signal: AbortSignal.timeout(15000) },
      ));
      const { selected } = await response.json();
      if (!selected) throw new Error("Select a Word template for this newsletter in Create.");
      await downloadTemplatedNewsletter(selected, title, text, "docx");
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
      {error && <p role="alert">{error}</p>}
      {open && <PostPreview title={title} text={text} account={account} channel={channel} format={format}
        media={media} unsaved={false} AssetMedia={AssetMedia} onClose={() => setOpen(false)} />}
    </>
  );
}
