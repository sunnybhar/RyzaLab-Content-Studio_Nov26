"use client";

import { useState } from "react";
import { localMediaUrl } from "@/lib/studio/local-media-url";
import type { Command, Content, Job } from "@/lib/studio/types";

export function LocalMediaAssistant({
  kind, content, jobs, disabled, request, send, attach,
}: {
  kind: "image" | "video";
  content: Content;
  jobs: Job[];
  disabled: boolean;
  request: (command: Command) => Promise<{ cost: number; model: string }>;
  send: (command: Command) => Promise<unknown>;
  attach: (source: string, prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [estimate, setEstimate] = useState<{cost: number; model: string; revision: number; key: string}>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = jobs.find((job) => ["queued", "running", "unknown", "awaiting_confirmation"].includes(job.state));
  const currentEstimate = estimate?.revision === content.revision ? estimate : undefined;
  const input = { kind, contentId: content.id, expectedRevision: content.revision, prompt };
  async function perform(action: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The media request could not be completed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="s-version" aria-label={kind === "image" ? "AI image generation" : "AI video generation"}>
      <h3>{kind === "image" ? "Generate an image" : "Generate a video clip"}</h3>
      <p>{kind === "image" ? "OpenAI GPT Image · 1024 × 1024" : "Gemini Veo 3.1 · 8 seconds · 720p landscape"}</p>
      {kind === "image" && (
        <p>{content.text.trim() ? "Uses the saved idea title and draft copy." : "Uses the saved title and any linked idea brief."}</p>
      )}
      <label className="s-field">
        {kind === "image" ? "Visual direction (optional)" : "Video brief"}
        <textarea
          value={prompt}
          maxLength={kind === "image" ? 1200 : 12000}
          disabled={busy}
          onChange={(event) => { setPrompt(event.target.value); setEstimate(undefined); }}
        />
      </label>
      <div className="s-actions">
        <button type="button" className="s-btn" disabled={disabled || busy || !!pending || (kind === "video" && prompt.trim().length < 12)}
          onClick={() => void perform(async () => {
            const quote = await request({ ...input, type: "media.quote" });
            setEstimate({ ...quote, revision: content.revision, key: crypto.randomUUID() });
          })}>
          Estimate cost
        </button>
        {currentEstimate && (
          <button type="button" className="s-btn s-primary" disabled={disabled || busy || !!pending}
            onClick={() => void perform(async () => {
              await send({ ...input, type: "media.generate", maximum: currentEstimate.cost, idempotencyKey: currentEstimate.key });
              setEstimate(undefined);
            })}>
            Generate {kind} · up to ${(currentEstimate.cost / 100).toFixed(2)}
          </button>
        )}
      </div>
      {currentEstimate && <p>{currentEstimate.model}. The generation prompt is sent to your connected provider.</p>}
      {error && <p role="alert">{error}</p>}
      {jobs.slice(0, 5).map((job) => (
        <article className="s-version" key={job.id}>
          <strong>{job.state === "running" ? "Generating" : job.state.replaceAll("_", " ")}</strong>
          {job.error && <p role="status">{job.error}</p>}
          {job.state === "running" && job.localVideoOperation && (
            <button type="button" className="s-btn" disabled={busy}
              onClick={() => void perform(() => send({ type: "media.check", jobId: job.id }))}>
              Check video progress
            </button>
          )}
          {job.state === "succeeded" && job.result && localMediaUrl.test(job.result) && (
            <>
              {kind === "image"
                ? <img src={job.result} alt="AI-generated concept" style={{ maxWidth: "100%", maxHeight: 320 }} />
                : <video src={job.result} controls preload="metadata" style={{ maxWidth: "100%" }} />}
              <div className="s-actions">
                <button type="button" className="s-btn" disabled={disabled || busy}
                  onClick={() => attach(job.result!, job.prompt)}>
                  {kind === "image" ? "Use as main image" : "Add as scene"}
                </button>
                <a className="s-btn" href={job.result} download={kind === "image" ? "studio-image.png" : "studio-video.mp4"}>
                  Download {kind}
                </a>
              </div>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
