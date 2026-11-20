"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Content } from "@/lib/studio/types";
import { checkedNewsletterResponse, newsletterTemplateEndpoint } from "./newsletter-template-export";
import { PostPreview } from "./post-preview";

export function ReviewPostPreview({
  content, local, AssetMedia,
}: {
  content: Content;
  local: boolean;
  AssetMedia: ComponentType<{ source: string; kind?: "image" | "video" | "audio" }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="s-btn" onClick={() => setOpen(true)}>Preview post</button>
      {open && <SavedPostPreview content={content} local={local} AssetMedia={AssetMedia} onClose={() => setOpen(false)} />}
    </>
  );
}

function SavedPostPreview({ content, local, AssetMedia, onClose }: Parameters<typeof ReviewPostPreview>[0] & { onClose: () => void }) {
  const { id, title, text, channel, format, account, media } = content;
  const templatedNewsletter = local && channel === "Newsletter";
  const [preview, setPreview] = useState<{ url?: string; error?: string }>();
  const [showReader, setShowReader] = useState(false);

  useEffect(() => {
    if (!templatedNewsletter) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(75000)]);
    let objectUrl: string | undefined;
    async function load() {
      try {
        const library = await checkedNewsletterResponse(await fetch(
          `${newsletterTemplateEndpoint}?contentId=${encodeURIComponent(id)}`, { signal, cache: "no-store" },
        ));
        const { selected } = await library.json();
        if (!selected) {
          if (!signal.aborted) setPreview({});
          return;
        }
        const response = await checkedNewsletterResponse(await fetch(newsletterTemplateEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selected, title, text, format: "pdf" }),
          signal,
        }));
        const blob = await response.blob();
        if (signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setPreview({ error: cause instanceof Error ? cause.message : "Could not render this newsletter template." });
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [templatedNewsletter, id, title, text]);

  const documentPreview = templatedNewsletter && !showReader && (
    preview?.url ? (
      <>
        <a className="s-btn" href={preview.url} target="_blank" rel="noreferrer">Open PDF in new tab</a>
        <iframe className="s-newsletter-preview-frame" title="Newsletter template PDF" src={preview.url} />
      </>
    ) : preview?.error ? (
      <>
        <p role="alert">{preview.error}</p>
        <button type="button" className="s-btn" onClick={() => setShowReader(true)}>Show reading preview</button>
      </>
    ) : !preview ? <p role="status">Preparing newsletter preview…</p> : undefined
  );

  return <PostPreview title={title} text={text} account={account} channel={channel} format={format}
    media={media} unsaved={false} AssetMedia={AssetMedia} documentPreview={documentPreview || undefined} onClose={onClose} />;
}
