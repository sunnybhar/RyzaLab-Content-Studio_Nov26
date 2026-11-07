"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { MediaProject } from "@/lib/studio/types";
import {ArticleBody} from "./article-images";
import { SlideLayerPreview } from "./slide-layers";
import "./post-preview.css";

export function PostPreview({
  text,
  format,
  account,
  channel,
  media,
  unsaved,
  AssetMedia,
  onClose,
}: {
  text: string;
  format?:string;
  account: string;
  channel: string;
  media: MediaProject;
  unsaved: boolean;
  AssetMedia: ComponentType<{
    source: string;
    kind?: "image" | "video" | "audio";
  }>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const slide = media.slides[slideIndex];
  const article=/Newsletter|Hub/i.test(channel)||/blog|article|newsletter/i.test(format||"");
  return (
    <dialog
      ref={dialog}
      className="s-review-dialog s-post-preview"
      aria-labelledby="post-preview-title"
      onClose={onClose}
    >
      <div className="s-review-dialog-heading">
        <h2 id="post-preview-title">{channel} post preview</h2>
        <button className="s-btn" onClick={() => dialog.current?.close()}>
          Close preview
        </button>
      </div>
      <div className="s-review-dialog-body">
        <p>
          Approximate feed appearance ·{" "}
          {unsaved ? "Includes unsaved edits" : "Current draft"}. Platform
          display may vary.
        </p>
        <article className="s-feed-post">
          <header>
            <div className="s-feed-avatar" aria-hidden="true">
              {(account || "R").slice(0, 1)}
            </div>
            <div>
              <strong>{account || "Account not selected"}</strong>
              <div>Draft · {channel}</div>
            </div>
          </header>
          {article?<ArticleBody text={text} media={media} AssetMedia={AssetMedia}/>:<div className={`s-feed-copy ${expanded ? "" : "s-feed-clamped"}`}>
            {text || "Your post text will appear here."}
          </div>}
          {!article&&text.length > 250 && (
            <button
              className="s-text-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : "…see more"}
            </button>
          )}
          {!article&&media.imageUrl && (
            <div className="s-feed-media">
              <AssetMedia source={media.imageUrl} />
            </div>
          )}
          {slide && (
            <section aria-label="Carousel preview">
              <div
                className="s-slide-preview"
                style={{ background: slide.background, color: slide.color }}
              >
                {slide.image && <AssetMedia source={slide.image} />}
                <div
                  className="s-slide-copy"
                  style={{
                    left: `${slide.x}%`,
                    top: `${slide.y}%`,
                    width: `max(1px, calc(${100 - slide.x}% - 3.7037cqw))`,
                  }}
                >
                  <h2
                    style={{
                      fontSize: `calc(${slide.fontSize} / 1080 * 100cqw)`,
                    }}
                  >
                    {slide.title}
                  </h2>
                  <p
                    style={{
                      fontSize: `calc(${slide.fontSize * 0.55} / 1080 * 100cqw)`,
                    }}
                  >
                    {slide.body}
                  </p>
                </div>
                {(slide.layers || []).map((layer) => (
                  <SlideLayerPreview
                    key={layer.id}
                    layer={layer}
                    readOnly
                    selected={false}
                    onSelect={() => {}}
                    onMove={() => {}}
                  />
                ))}
              </div>
              <div className="s-actions">
                <button
                  className="s-btn"
                  disabled={!slideIndex}
                  onClick={() => setSlideIndex(slideIndex - 1)}
                >
                  Previous slide
                </button>
                <span>
                  {slideIndex + 1} / {media.slides.length}
                </span>
                <button
                  className="s-btn"
                  disabled={slideIndex === media.slides.length - 1}
                  onClick={() => setSlideIndex(slideIndex + 1)}
                >
                  Next slide
                </button>
              </div>
            </section>
          )}
          {media.scenes.length > 0 && (
            <section className="s-feed-media">
              <p>Source scenes — final video composition may differ.</p>
              {media.scenes.map((scene) => (
                <div key={scene.id}>
                  {scene.sourceUrl && (
                    <AssetMedia source={scene.sourceUrl} kind="video" />
                  )}
                  {scene.audioUrl && (
                    <AssetMedia source={scene.audioUrl} kind="audio" />
                  )}
                </div>
              ))}
            </section>
          )}
          {!article&&<footer>Like · Comment · Repost · Send</footer>}
        </article>
        <p>Preview only. Publishing stays on the platform.</p>
      </div>
    </dialog>
  );
}
