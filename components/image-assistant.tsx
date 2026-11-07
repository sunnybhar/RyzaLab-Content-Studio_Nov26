"use client";
import {documentSections} from "@/lib/studio/document-sections";
import {isLongForm} from "@/lib/studio/channel-writing";
import {resolvedConnection} from "@/lib/studio/solo-quality";
import { useEffect, useState } from "react";
import type { Actor, Command, Content, StudioState } from "@/lib/studio/types";
import { preparationFor } from "@/lib/studio/preparation-budget";
import { can } from "@/lib/studio/permissions";
import type { ComponentType } from "react";
import { downloadImageAsset } from "@/lib/studio/exports";
const money = (value: number) => `$${(value / 100).toFixed(2)}`;
export function ImageAssistant({
  content,
  state,
  actor,
  dirty,
  readOnly,
  busy,
  run,
  refresh,
  progressJob,
  AssetMedia,
}: {
  AssetMedia: ComponentType<{ source: string }>;
  content: Content;
  state: StudioState;
  actor: Actor;
  dirty: boolean;
  readOnly: boolean;
  busy: boolean;
  run: (command: Command, message?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  progressJob?: (id: string) => Promise<unknown>;
}) {
  const sections=isLongForm(content.channel,content.format)?documentSections(content.text):[];
  const [caption,setCaption]=useState("AI-generated concept illustration.");
  const [downloadError, setDownloadError] = useState("");
  const [prompt, setPrompt] = useState(content.media.imagePrompt || ""),
    [alt, setAlt] = useState(
      content.media.imageAlt || "AI-generated concept illustration",
    ),
    [placement, setPlacement] = useState("hero"),
    [consent, setConsent] = useState(false);
  const workflow = state.workflows.find(
      (w) => w.channel === content.channel && w.status === "active",
    ),
    connection = state.connections.find(
      (c) => c.id === resolvedConnection(state,content.channel,"image"),
    );
  const qualified = state.settings.qualifiedRates?.find(
    (r) =>
      r.provider === connection?.provider &&
      r.model === connection?.model &&
      r.function === "image",
  );
  const maximum =
    qualified?.fixedCents ||
    (connection as typeof connection & { maxRequestCost?: number })
      ?.maxRequestCost ||
    0;
  const configured =
    connection?.provider === "openai" &&
    /^gpt-image-[a-z0-9.-]+$/i.test(connection.model) &&
    connection.status === "validated" &&
    connection.hasKey &&
    maximum > 0;
  const jobs = state.jobs.filter(
    (j) => j.contentId === content.id && j.kind === "image",
  );
  const pending = jobs.find((j) =>
    ["queued", "running", "awaiting_confirmation", "unknown"].includes(j.state),
  );
  const preparation = preparationFor(
    state,
    content,
    actor.email,
    new Date().toISOString(),
  );
  const needsAuthorization =
    state.settings.reviewPolicy?.mode === "two_step" &&
    (!preparation || !preparation.functions.includes("image"));
  const packageCap =
    preparation?.maxCents ||
    Math.min(200, state.settings.reviewPolicy?.packageCap || 0);
  const canAuthorize = can(state, actor, "package.approve", {
    channel: content.channel,
    account: content.account,
    contentId: content.id,
    assignedTo: content.assignedTo,
  });
  useEffect(() => {
    if (!jobs.some((j) => ["queued", "running"].includes(j.state))) return;
    const timer = setInterval(() => void refresh(), 6000);
    return () => clearInterval(timer);
  }, [jobs.map((j) => j.id + j.state).join(), refresh]);
  return (
    <section
      className="s-version"
      aria-label="AI images"
      style={{ marginTop: 24, marginBottom: 24, padding: 20 }}
    >
      <h3>Images for this content</h3>
      {downloadError && <p role="alert">{downloadError}</p>}
      <p>
        Use one OpenAI image connection across posts, Blogs and Newsletters.
        Images are optional.
      </p>
      {!configured && (
        <p role="status">
          In AI &amp; budgets, securely connect and validate OpenAI for Image,
          qualify its model/pricing, then map Image in this channel’s Workflow
          settings. Never paste an API key into a prompt.
        </p>
      )}
      <label className="s-field">
        Image brief
        <textarea
          aria-label="Image brief"
          value={prompt}
          maxLength={12000}
          onChange={(e) => {
            setPrompt(e.target.value);
            setConsent(false);
          }}
          placeholder="Describe the concept, composition and mood. Keep private information out."
        />
      </label>
      {needsAuthorization && (
        <p role="status">
          This draft needs an image-enabled package allowance.
          {canAuthorize
            ? " Authorize or update its total budget in the writing controls above."
            : " Ask the founder to authorize image work within the package allowance."}
        </p>
      )}
      {needsAuthorization && canAuthorize && packageCap > 0 && (
        <button
          className="s-btn"
          disabled={dirty || readOnly || busy}
          onClick={() =>
            void run(
              {
                type: "preparation.authorize",
                contentId: content.id,
                expectedRevision: content.revision,
                maxCents: packageCap,
                includeImages: true,
              },
              "Images enabled within package allowance",
            )
          }
        >
          Enable images within {money(packageCap)} total package allowance
        </button>
      )}
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        Approve one image request up to {money(maximum)} within the existing
        package cap.
      </label>
      <div className="s-actions">
        <button
          className="s-btn"
          disabled={
            readOnly ||
            dirty ||
            busy ||
            !configured ||
            needsAuthorization ||
            !!pending ||
            !consent ||
            prompt.trim().length < 12
          }
          onClick={async () => {
            if (
              await run(
                {
                  type: "job.enqueue",
                  kind: "image",
                  channel: content.channel,
                  contentId: content.id,
                  connectionId: connection!.id,
                  prompt,
                  estimate: maximum,
                  idempotencyKey: crypto.randomUUID(),
                  confirmed: true,
                },
                "Image request queued",
              )
            )
              setConsent(false);
          }}
        >
          Generate image
        </button>
      </div>
      {dirty && <p>Save your draft before generating or applying an image.</p>}
      {jobs.slice(0, 10).map((job) => (
        <article key={job.id} className="s-version">
          <strong>Image · {job.state.replaceAll("_", " ")}</strong>
          <p>
            Requested {new Date(job.createdAt).toLocaleString()} · Maximum{" "}
            {money(job.estimate)} ·{" "}
            {job.actual === undefined
              ? `Reserved ${money(job.reserved)}`
              : `Actual ${money(job.actual)}`}
          </p>
          {job.error && <p role="status">{job.error}</p>}
          {job.state === "awaiting_confirmation" && (
            <button
              className="s-btn"
              disabled={busy || readOnly}
              onClick={() => void run({ type: "job.confirm", id: job.id })}
            >
              Confirm existing request
            </button>
          )}
          {["queued", "running", "unknown"].includes(job.state) && (
            <button
              className="s-btn"
              disabled={busy}
              onClick={() =>
                void (progressJob ? progressJob(job.id) : refresh())
              }
            >
              Check existing image request
            </button>
          )}
          {job.state === "unknown" && (
            <p>
              The outcome is uncertain. Reconcile the existing request in AI
              &amp; budgets before another paid request.
            </p>
          )}
          {job.state === "succeeded" &&
            /^\/api\/studio\/assets\?id=/.test(job.result || "") && (
              <>
                <AssetMedia source={job.result!} />
                <p>AI-generated concept; not a real installation.</p>
                <label className="s-field">
                  Image description
                  <input
                    aria-label="Image description"
                    value={alt}
                    maxLength={1000}
                    onChange={(e) => setAlt(e.target.value)}
                  />
                </label>
                <label className="s-field">
                  Use image in
                  <select
                    aria-label="Image placement"
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value)}
                  >
                    <option value="hero">Post / article main image</option>
                    {sections.map(section=><option key={section.key} value={section.key}>Section: {section.title}</option>)}
                    {content.media.slides.map((slide) => (
                      <option key={slide.id} value={slide.id}>
                        Slide: {slide.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="s-field">Image caption<input aria-label="Image caption" value={caption} maxLength={1000} onChange={e=>setCaption(e.target.value)}/></label>
                <div className="s-actions">
                  <button
                    className="s-btn"
                    disabled={readOnly || dirty || busy || !alt.trim()}
                    onClick={() =>
                      void run(
                        {
                          type: "content.image.apply",
                          contentId: content.id,
                          jobId: job.id,
                          expectedRevision: content.revision,
                          alt,caption,
                          sectionKey:placement.startsWith("section:")?placement:undefined,
                          slideId: placement === "hero" || placement.startsWith("section:") ? undefined : placement,
                        },
                        "Image attached to draft",
                      )
                    }
                  >
                    Use image
                  </button>
                  <button
                    className="s-btn"
                    onClick={() =>
                      void downloadImageAsset(job.result!).catch((e) =>
                        setDownloadError(String(e)),
                      )
                    }
                  >
                    Download image
                  </button>
                </div>
              </>
            )}
        </article>
      ))}
      <p>
        Each Generate action is a new paid request. Provider totals may need
        invoice reconciliation; a reservation is not an actual charge.
      </p>
    </section>
  );
}
