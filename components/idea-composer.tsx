"use client";
import {ACTIVE_CHANNELS as CHANNELS} from "@/lib/studio/active-channels";
import {ResearchPanel} from "./research-panel";
import {IdeaRunProgress} from "./idea-run-progress";
import {relevantIdeaCitation} from "@/lib/studio/idea-research-query";
import {researchEvidence} from "@/lib/studio/research-link";
import { useEffect, useRef, useState } from "react";
import {
  type Actor,
  type Channel,
  type Command,
  type Idea,
  type StudioState,
} from "@/lib/studio/types";
import { completeSavedIdeaCards } from "@/lib/studio/idea-recovery";
import { parseGeneratedIdeas } from "@/lib/studio/idea-generation";
import { IdeaEvidence, SourceReferences } from "./idea-evidence";
export function IdeaComposer({
  mode,
  initialBriefId,
  initialChannel,
  state,
  actor,
  demo,
  local = false,
  send,
  refresh,
  close,
  openContent,
  onSaved,
}: {
  initialBriefId?:string;
  onSaved?: (message: string) => void;
  mode: "generate" | "manual";
  initialChannel: Channel;
  state: StudioState;
  actor: Actor;
  demo: boolean;
  local?: boolean;
  send: (command: Command) => Promise<unknown>;
  refresh: (force?:boolean) => Promise<void>;
  close: () => void;
  openContent: (idea: Idea, format?: "Article") => Promise<boolean>;
}) {
  const resumed=!demo?state.jobs.find(j=>j.kind==="ideas"&&!j.contentId&&j.channel===initialChannel&&j.createdBy===actor.email&&j.ideaPurpose===(mode==="manual"?"manual_assistance":undefined)&&["queued","running","awaiting_confirmation","unknown"].includes(j.state)):undefined;
  let resumeInput:{topic?:string;audience?:string;sourceText?:string;quantity?:number;pipeline?:{id?:string}}={};try{resumeInput=resumed?JSON.parse(resumed.prompt):{};}catch{}
  const [selectedResearch,setSelectedResearch]=useState<string[]>([]);
  const [pipelineBriefId,setPipelineBriefId]=useState(initialBriefId||resumeInput.pipeline?.id);
  const initialBrief=state.pipelineBriefs?.find(b=>b.id===pipelineBriefId);
  const dialog = useRef<HTMLDialogElement>(null),
    [title, setTitle] = useState(resumeInput.topic||initialBrief?.title||""),
    [brief, setBrief] = useState(resumeInput.sourceText||[initialBrief?.angle,initialBrief?.sourceUrls.join("\n")].filter(Boolean).join("\n\n")),
    [audience, setAudience] = useState(resumeInput.audience||initialBrief?.audience||""),
    [quantity, setQuantity] = useState(resumeInput.quantity||3),
    [channel, setChannel] = useState(initialChannel),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [submitted, setSubmitted] = useState<string|undefined>(resumed?.idempotencyKey);
  const [startedAt,setStartedAt]=useState(resumed?Date.parse(resumed.createdAt):Date.now()),[lastChecked,setLastChecked]=useState<number>(),[syncError,setSyncError]=useState("");
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
  async function checkStatus(clearRequestError=false){try{await refreshRef.current(clearRequestError);setLastChecked(Date.now());setSyncError("");if(clearRequestError)setError("");}catch{setSyncError("Status could not be refreshed. No new AI request was made.");}}
  useEffect(() => {
    if (demo || !(pending || (busy && submitted))) return;
    const timer = setInterval(
      () => void checkStatus(),
      4000,
    );
    return () => clearInterval(timer);
  }, [demo, pending, busy, submitted]);
  const cards = submitted
    ? state.ideas.filter((i) =>
        demo
          ? i.generationRunId === `sample:${submitted}`
          : Boolean(job && i.generationRunId === job.id),
      )
    : [];
  const recoverable = mode === "generate" && job?.state === "succeeded" && !cards.length
    ? completeSavedIdeaCards(job)
    : [];
  async function recoverIdeas(jobId: string) {
    setBusy(true);
    setError("");
    try {
      await send({ type: "idea.recoverCompleteCards", jobId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not recover saved ideas.");
    } finally {
      setBusy(false);
    }
  }
  let proposal: ReturnType<typeof parseGeneratedIdeas>[number] | undefined;
  if (mode === "manual" && job?.state === "succeeded" && job.result)
    try {
      proposal = parseGeneratedIdeas(job.result, 1)[0];
    } catch {}
  const evidenceIds = job?.researchJobIds || selectedResearch;
  let relevanceWarning=false;try{relevanceWarning=Boolean(job)&&researchEvidence(state,actor,channel,evidenceIds).some(result=>result.citations.every(cite=>!relevantIdeaCitation(cite,title,audience)));}catch{}
  async function confirmRequest(){setBusy(true);setError("");try{await send({type:"job.confirm",id:job!.id});setLastChecked(Date.now());}catch(e){setError(e instanceof Error?e.message:"Could not confirm this request.");try{await refreshRef.current(true);setLastChecked(Date.now());}catch{setSyncError("Approval status could not be refreshed. Check this existing request; do not create another one.");}}finally{setBusy(false);}}

  useEffect(()=>{if(job&&["queued","running","succeeded"].includes(job.state))setError("");},[job?.id,job?.state]);

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
      selectedResearch,
    });
    if (!retry.current || retry.current.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    const key = retry.current.key;
    setBusy(true);
    setError("");
    setSubmitted(key);
    setStartedAt(Date.now());setLastChecked(undefined);setSyncError("");
    try {
      await send({
        type: "idea.generate",
        pipelineBriefId,
        automaticResearch: !selectedResearch.length,
        researchJobIds:selectedResearch,
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
      const message = e instanceof Error
        ? e.message
        : "Research/generation could not complete. Check the saved request before trying again.";
      // Only a confirmed pre-generation failure permits a fresh request key.
      if (/^Research found \d+ of \d+ required usable sources.*No paid generation was started\.$/.test(message) ||
          /^Online research found no usable sources for this idea\..*No paid idea request was sent\.$/.test(message)) {
        retry.current = null;
        void refreshRef.current(true).catch(() => {});
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }
  async function openIdea(idea: Idea, format?: "Article") {
    setBusy(true);
    setError("");
    try {
      if (await openContent(idea, format)) close();
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
        pipelineBriefId,
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
      onSaved?.("Idea saved");
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
      <div className="s-idea-composer-body" role="region" aria-label="Idea request and results" tabIndex={0}>
      <p>
        {mode === "manual"
          ? "Enter your own idea. You can save it directly or research and develop it with AI here."
          : "Enter a topic and the agent will automatically retrieve public references, generate the requested ideas and show sources alongside them."}
      </p>
      <p>
        When automatic drafting is enabled, opening writing also starts its
        first AI draft within the founder-approved post allowance.
      </p>
      {local && <p>Studio aims for at least 10 usable sources. When coverage is lower, it marks the ideas as provisional. Put each public source link on its own line in the source field.</p>}
      {!!selectedResearch.length&&<p role="status">Using {selectedResearch.length} saved research result(s). Generating ideas will reuse these sources without another public search.</p>}
      {submitted&&<IdeaRunProgress job={job} busy={busy} startedAt={startedAt} sourceCount={evidenceIds.length} readyCount={mode==="manual"?(proposal?1:0):cards.length} targetCount={mode==="manual"?1:quantity} lastChecked={lastChecked} syncError={syncError} requestError={error} refresh={()=>checkStatus(true)} confirm={confirmRequest}/>}
      {relevanceWarning&&<p className="s-alert s-error" role="alert">These saved references do not match the current topic/audience well. They are retained for audit; inspect the ideas before using them. This request will not be regenerated automatically.</p>}
      {mode === "generate" && job?.state === "succeeded" && !cards.length && (
        <div className="s-version">
          <p>{recoverable.length
            ? "The saved response includes complete ideas you can recover."
            : "There are no generated idea cards available for this request."}</p>
          {recoverable.length > 0 && (
            <button type="button" className="s-btn" disabled={working} onClick={() => void recoverIdeas(job.id)}>
              Recover {recoverable.length} saved {recoverable.length === 1 ? "idea" : "ideas"}
            </button>
          )}
        </div>
      )}
      {mode === "generate" && cards.length > 0 && (
        <section aria-label="Generated ideas">
          <h3>Generated ideas ({cards.length})</h3>
          {cards.map((idea) => (
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
                {local ? "Create draft" : "Use idea and open writing"}
              </button>
              {idea.channel === "LinkedIn" && (
                <button type="button" className="s-btn" disabled={working} onClick={() => void openIdea(idea, "Article")}>
                  Create Blog Article
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {!!state.pipelineBriefs?.length&&<label className="s-field">Existing Pipeline<select aria-label="Existing Pipeline" value={pipelineBriefId||""} disabled={working} onChange={e=>{const b=state.pipelineBriefs?.find(b=>b.id===e.target.value);setPipelineBriefId(b?.id);if(b){editTitle(b.title);setBrief([b.angle,b.sourceUrls.join("\n")].filter(Boolean).join("\n\n"));setAudience(b.audience);}else{editTitle("");setBrief("");setAudience("");}}}><option value="">Start from a new topic</option>{state.pipelineBriefs.map(b=><option key={b.id} value={b.id}>{b.title} · {b.plannedDate||"Unscheduled"} · {b.channel}</option>)}</select></label>}
      <details className="s-version"><summary>Use saved research or add source links</summary><ResearchPanel state={state} actor={actor} channel={channel} selected={selectedResearch} onSelected={setSelectedResearch} run={async command=>{try{await send(command);setError("");return true;}catch(e){setError(e instanceof Error?e.message:"Research could not complete. Saved sources remain available.");return false;}}} refresh={refresh} disabled={working} demo={demo}/></details>
      <details open={mode==="manual"||!submitted} className="s-idea-request-details"><summary>Request details{mode==="generate"?` · ${channel} · ${quantity} ideas`:""}</summary>
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
            : "AI research sends the topic/title above to public reference providers. Keep private details out of it. It searches web/news sources, reads accessible article passages and retrieves available scholarly abstracts. Wikipedia is excluded. Your configured AI uses this evidence within existing spending limits. Research is evidence, not automatic fact verification."}
        </p>
        {error && !submitted && <p role="alert">{error}</p>}
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
            {job?.state==="awaiting_confirmation"?"Waiting for allowance confirmation":job?.state==="running"?"Generating ideas…":working
              ? "Researching and preparing…"
              : demo
                ? "Preview sample ideas"
                : "Generate ideas"}
          </button>
        )}
      </form>
      </details>
      {mode === "manual" && proposal && (
        <section>
          <h3>AI research and development</h3>
          <p>{proposal.brief}</p>
          {!job?.researchUnavailable && <SourceReferences sources={proposal.sources} />}
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
      <IdeaEvidence
        state={state}
        actor={actor}
        channel={channel}
        ids={evidenceIds}
      />
      </div>
    </dialog>
  );
}
