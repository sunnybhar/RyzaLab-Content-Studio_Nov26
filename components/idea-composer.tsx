"use client";
import { useEffect, useRef, useState } from "react";
import {
  CHANNELS,
  type Actor,
  type Channel,
  type Command,
  type Idea,
  type StudioState,
} from "@/lib/studio/types";
import { parseGeneratedIdeas } from "@/lib/studio/idea-generation";
import { IdeaEvidence, SourceReferences } from "./idea-evidence";
export function IdeaComposer({
  mode,
  initialChannel,
  state,
  actor,
  demo,
  send,
  refresh,
  close,
  openContent,
}: {
  mode: "generate" | "manual";
  initialChannel: Channel;
  state: StudioState;
  actor: Actor;
  demo: boolean;
  send: (command: Command) => Promise<unknown>;
  refresh: () => Promise<void>;
  close: () => void;
  openContent: (idea: Idea) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [title, setTitle] = useState(""),
    [brief, setBrief] = useState(""),
    [audience, setAudience] = useState(""),
    [quantity, setQuantity] = useState(3),
    [channel, setChannel] = useState(initialChannel),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [submitted, setSubmitted] = useState<string>();
  const retry = useRef<{ signature: string; key: string } | null>(null),
    refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const job = state.jobs.find(
    (j) => j.createdBy === actor.email && j.idempotencyKey === submitted,
  );
  const pending = Boolean(
    job && ["queued", "running", "awaiting_confirmation"].includes(job.state),
  );
  const stopped = Boolean(
    job && ["unknown", "failed", "blocked"].includes(job.state),
  );
  const working = busy || pending;
  useEffect(() => {
    if (demo || !pending) return;
    const timer = setInterval(
      () => void refreshRef.current().catch(() => {}),
      4000,
    );
    return () => clearInterval(timer);
  }, [demo, pending]);
  const cards = submitted
    ? state.ideas.filter((i) =>
        demo
          ? i.generationRunId === `sample:${submitted}`
          : Boolean(job && i.generationRunId === job.id),
      )
    : [];
  let proposal: ReturnType<typeof parseGeneratedIdeas>[number] | undefined;
  if (mode === "manual" && job?.state === "succeeded" && job.result)
    try {
      proposal = parseGeneratedIdeas(job.result, 1)[0];
    } catch {}
  const evidenceIds = job?.researchJobIds || [];
  function editTitle(value: string) {
    setTitle(value);
    setSubmitted(undefined);
    retry.current = null;
    setError("");
  }
  async function generate() {
    if (title.trim().length < 5) {
      setError("Enter a public topic of at least five characters.");
      return;
    }
    const signature = JSON.stringify({
      title,
      brief,
      audience,
      quantity,
      channel,
      mode,
    });
    if (!retry.current || retry.current.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    const key = retry.current.key;
    setBusy(true);
    setError("");
    setSubmitted(key);
    try {
      await send({
        type: "idea.generate",
        automaticResearch: true,
        purpose: mode === "manual" ? "manual_assistance" : undefined,
        channel,
        topic: title.trim(),
        audience: audience.trim() || "Selected channel audience",
        quantity: mode === "manual" ? 1 : quantity,
        research: !demo,
        sourceText: brief,
        idempotencyKey: key,
      });
      retry.current = null;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Research/generation could not complete. Check the saved request before trying again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openIdea(idea: Idea) {
    setBusy(true);
    setError("");
    try {
      if (await openContent(idea)) close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open writing.");
    } finally {
      setBusy(false);
    }
  }
  async function save(open: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = (await send({
        type: "idea.create",
        title: title.trim(),
        brief,
        channel,
        researchJobIds: evidenceIds,
      })) as { state?: StudioState } | undefined;
      const idea = result?.state?.ideas.find(
        (i) =>
          i.origin === "manual" &&
          i.createdBy === actor.email &&
          i.channel === channel &&
          i.title === title.trim(),
      );
      if (open) {
        if (!idea)
          throw new Error(
            "The idea was saved. Open it from Ideas to continue writing.",
          );
        if (!(await openContent(idea))) return;
      }
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the idea.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="s-modal s-idea-composer"
      aria-label={
        mode === "manual"
          ? "Capture a new idea"
          : "Generate ideas with an agent"
      }
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="s-modal-heading">
        <h2>
          {mode === "manual"
            ? "Capture a new idea"
            : "Generate ideas with an agent"}
        </h2>
        <button
          type="button"
          className="s-btn"
          aria-label="Close idea window"
          disabled={busy}
          onClick={close}
        >
          Close
        </button>
      </div>
      <p>
        {mode === "manual"
          ? "Enter your own idea. You can save it directly or research and develop it with AI here."
          : "Enter a topic and the agent will automatically retrieve public references, generate the requested ideas and show sources alongside them."}
      </p>
      <p>
        When automatic drafting is enabled, opening writing also starts its
        first AI draft within the founder-approved post allowance.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void (mode === "manual" ? save(false) : generate());
        }}
      >
        <label className="s-field">
          {mode === "manual" ? "Idea title" : "Topic / Brief"}
          <textarea
            aria-label={mode === "manual" ? "Idea title" : "Topic / Brief"}
            value={title}
            onChange={(event) => editTitle(event.target.value)}
            required
            maxLength={mode === "manual" ? 200 : 500}
            disabled={working}
            rows={2}
          />
        </label>
        <label className="s-field">
          Channel
          <select
            aria-label="Channel"
            value={channel}
            disabled={working}
            onChange={(event) => {
              setChannel(event.target.value as Channel);
              setSubmitted(undefined);
              retry.current = null;
            }}
          >
            {CHANNELS.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="s-field">
          {mode === "manual"
            ? "What is the angle?"
            : "Source references / source text"}
          <textarea
            aria-label={
              mode === "manual"
                ? "What is the angle?"
                : "Source references / source text"
            }
            value={brief}
            disabled={working}
            onChange={(event) => setBrief(event.target.value)}
            maxLength={12000}
            rows={3}
          />
        </label>
        <label className="s-field">
          Audience
          <input
            aria-label="Audience"
            value={audience}
            disabled={working}
            onChange={(event) => setAudience(event.target.value)}
            required={mode === "generate"}
            maxLength={500}
          />
        </label>
        {mode === "generate" && (
          <label className="s-field">
            Quantity
            <input
              aria-label="Quantity"
              type="number"
              value={quantity}
              min={1}
              max={20}
              step={1}
              required
              disabled={working}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
          </label>
        )}
        <p>
          {demo
            ? "Preview produces labelled examples only; no web retrieval or paid model is run."
            : "AI research sends the topic/title above to public reference providers. Keep private details out of it. It retrieves Wikipedia introductions and Crossref abstracts, then uses your configured AI within existing spending limits. Research is evidence, not automatic fact verification."}
        </p>
        {error && <p role="alert">{error}</p>}
        {mode === "manual" ? (
          <div className="s-actions">
            <button
              className="s-btn"
              type="submit"
              disabled={working || !title.trim()}
            >
              Add idea
            </button>
            <button
              className="s-btn"
              type="button"
              disabled={demo || working || stopped || title.trim().length < 5}
              onClick={() => void generate()}
            >
              Research and develop this idea
            </button>
            <button
              className="s-btn"
              type="button"
              disabled={working || !title.trim()}
              onClick={() => void save(true)}
            >
              Save idea and open writing
            </button>
          </div>
        ) : (
          <button
            className="s-btn s-primary"
            type="submit"
            disabled={working || stopped}
          >
            {working
              ? "Researching and generating…"
              : demo
                ? "Preview sample ideas"
                : "Generate ideas"}
          </button>
        )}
      </form>
      {job && (
        <div role="status">
          {job.state === "queued"
            ? "Research saved. AI request is queued."
            : job.state === "running"
              ? "The agent is developing ideas from the research."
              : job.state === "succeeded"
                ? "AI response received. Review the ideas and source evidence."
                : job.state === "awaiting_confirmation"
                  ? "Confirm this saved request in Idea generation status to continue within its budget."
                  : job.state}
          {job.error && <p>{job.error}</p>}
        </div>
      )}
      {job?.state === "awaiting_confirmation" && (
        <button
          type="button"
          className="s-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await send({ type: "job.confirm", id: job.id });
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not confirm this request.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm AI request allowance · ${(job.estimate / 100).toFixed(2)}
        </button>
      )}
      {mode === "manual" && proposal && (
        <section>
          <h3>AI research and development</h3>
          <p>{proposal.brief}</p>
          <SourceReferences sources={proposal.sources} />
          <button
            type="button"
            className="s-btn"
            disabled={working}
            onClick={() => setBrief(proposal!.brief)}
          >
            Use this AI development in my idea
          </button>
          <p>
            Your original title and angle are preserved until you choose to
            apply the proposal. Saved research carries into writing.
          </p>
        </section>
      )}
      {mode === "generate" &&
        cards.map((idea) => (
          <article key={idea.id} className="s-version">
            <h3>{idea.title}</h3>
            <p>{idea.brief}</p>
            <SourceReferences sources={idea.sources} />
            <button
              type="button"
              className="s-btn"
              disabled={working}
              onClick={() => void openIdea(idea)}
            >
              Use idea and open writing
            </button>
          </article>
        ))}
      <IdeaEvidence
        state={state}
        actor={actor}
        channel={channel}
        ids={evidenceIds}
      />
    </dialog>
  );
}
