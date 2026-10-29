"use client";

import { useEffect, useRef, type ComponentType } from "react";
import type { Package, Schedule } from "@/lib/studio/types";
import { SlideLayerPreview } from "./slide-layers";
import "./calendar-package-preview.css";

/** Display the immutable approved package selected for this calendar entry. */
export function CalendarPackagePreview({
  schedule,
  approved,
  timezone,
  AssetMedia,
  onClose,
  onEdit,
}: {
  schedule: Schedule;
  approved?: Package;
  timezone: string;
  AssetMedia: ComponentType<{source: string; kind?: "image" | "video" | "audio"}>;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="s-review-dialog s-calendar-preview" aria-labelledby="calendar-package-title" onClose={onClose}>
      <div className="s-review-dialog-heading">
        <h2 id="calendar-package-title">Approved publication</h2>
        <button className="s-btn s-small-btn" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <div className="s-review-dialog-body">
        {!approved ? (
          <p role="status">This calendar entry has no available approved package. Open the draft to review its status.</p>
        ) : (
          <>
            <h3>{approved.title}</h3>
            <p>{approved.channel} · {approved.account || "Account not specified"} · Revision {approved.revision}</p>
            <p>Planned for {new Date(schedule.at).toLocaleString("en-US", { timeZone: timezone })} ({timezone}) · {schedule.state === "published" ? "Published, human confirmed" : schedule.state}</p>
            <p>This is the approved snapshot for this calendar entry. A person publishes it.</p>
            <h4>Text</h4>
            <div className="s-calendar-snapshot-copy">{approved.text || "No text in this package."}</div>
            {approved.metadata && <><h4>Caption and metadata</h4><div className="s-calendar-snapshot-copy">{approved.metadata}</div></>}
            {approved.media.imageUrl && <section className="s-calendar-media"><h4>Image</h4><AssetMedia source={approved.media.imageUrl} /></section>}
            {approved.media.slides.length > 0 && <section><h4>Slides</h4><div className="s-calendar-slides">{approved.media.slides.map((slide, i) => (
              <div key={slide.id}><p>Slide {i + 1}</p><div className="s-slide-preview" style={{ background: slide.background, color: slide.color }}>
                {slide.image && <AssetMedia source={slide.image} />}
                <div className="s-slide-copy" style={{ left: `${slide.x}%`, top: `${slide.y}%`, width: `max(1px, calc(${100 - slide.x}% - 3.7037cqw))` }}><h2 style={{ fontSize: `calc(${slide.fontSize} / 1080 * 100cqw)` }}>{slide.title}</h2><p style={{ fontSize: `calc(${slide.fontSize * 0.55} / 1080 * 100cqw)`, marginTop: `calc(${slide.fontSize * 0.4} / 1080 * 100cqw)` }}>{slide.body}</p></div>
                {(slide.layers || []).map((layer) => <SlideLayerPreview key={layer.id} layer={layer} selected={false} onSelect={() => {}} onMove={() => {}} readOnly />)}
              </div></div>
            ))}</div></section>}
            {approved.media.scenes.length > 0 && <section><h4>Video and audio source scenes</h4><p>These are the approved source scenes; they may not be a final rendered video.</p>{approved.media.scenes.map((scene, i) => <div className="s-calendar-media" key={scene.id}><p>Scene {i + 1}: {scene.title} · {scene.duration}s</p>{scene.script && <div className="s-calendar-snapshot-copy">{scene.script}</div>}{scene.sourceUrl && <AssetMedia source={scene.sourceUrl} kind="video" />}{scene.audioUrl && <AssetMedia source={scene.audioUrl} kind="audio" />}</div>)}</section>}
            {approved.media.narration && <><h4>Narration</h4><div className="s-calendar-snapshot-copy">{approved.media.narration}</div></>}
            {approved.media.captions && <><h4>Captions</h4><div className="s-calendar-snapshot-copy">{approved.media.captions}</div></>}
          </>
        )}
        <div className="s-actions s-calendar-preview-actions"><button className="s-btn" onClick={() => { dialog.current?.close(); onEdit(schedule.contentId); }}>Open draft to edit</button></div>
      </div>
    </dialog>
  );
}
