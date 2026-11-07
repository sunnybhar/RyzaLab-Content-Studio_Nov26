"use client";
import { useEffect, useRef, useState } from "react";
import type { Package } from "@/lib/studio/types";
import { exportContentDocument } from "@/lib/studio/exports";
import { isLongForm } from "@/lib/studio/channel-writing";

export function PublicationHandoff({
  pkg,
  onClose,
}: {
  pkg: Package;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const newsletter = isLongForm(pkg.channel, pkg.format);
  async function copy() {
    try {
      await navigator.clipboard.writeText(pkg.text);
      setMessage(
        "Approved content copied. Paste it into your publishing platform.",
      );
    } catch {
      setMessage(
        "Copy was unavailable. Select and copy the approved text below.",
      );
    }
  }
  async function download(format: "docx" | "pdf") {
    try {
      await exportContentDocument(pkg.title, pkg.text, pkg.revision, format,{layout:pkg.documentLayout,imageUrl:pkg.media.imageUrl,imageAlt:pkg.media.imageAlt,imageCaption:pkg.media.imageCaption,sectionImages:pkg.media.sectionImages});
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Download failed.");
    }
  }
  return (
    <dialog
      ref={dialog}
      className="s-review-dialog"
      onClose={onClose}
      aria-label="Ready to publish"
    >
      <div className="s-dialog-head">
        <h2>Ready to publish</h2>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
      <div style={{ padding: 24 }}>
        <h3>{pkg.title}</h3>
        <p>
          Your review decision is saved. Copy or download the approved content
          and publish it on your platform.
        </p>
        <div className="s-actions">
          <button className="s-btn s-primary" onClick={() => void copy()}>
            Copy approved content
          </button>
          {pkg.channel === "LinkedIn" && (
            <a
              className="s-btn"
              href="https://www.linkedin.com/feed/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open LinkedIn
            </a>
          )}
          {newsletter && (
            <>
              <button className="s-btn" onClick={() => void download("docx")}>
                Download DOCX
              </button>
              <button className="s-btn" onClick={() => void download("pdf")}>
                Download PDF
              </button>
            </>
          )}
        </div>
        <p role="status">{message}</p>
        <details>
          <summary>Approved text</summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{pkg.text}</p>
        </details>
        <p>
          This app uses manual publishing. This version is approved; it has not
          been sent to {pkg.channel}.
        </p>
      </div>
    </dialog>
  );
}
