"use client";
import { useState } from "react";
import { CheckCircle2, Clock3, ChevronDown, ShieldCheck } from "lucide-react";
import type {
  Content,
  StudioState,
  Actor,
  Command,
  StageKey,
  StageRecord,
} from "@/lib/studio/types";
import { stageSummary, currentWorkflow, hasVisuals } from "@/lib/studio/stages";
import { can } from "@/lib/studio/permissions";
export function LegacyStageTracker({
  content,
  state,
  actor,
  send,
  onError,
}: {
  content: Content;
  state: StudioState;
  actor: Actor;
  send: (command: Command) => Promise<unknown>;
  onError?: (message: string) => void;
}) {
  const summary = stageSummary(content, state),
    [selected, setSelected] = useState<StageKey | null>(null),
    [status, setStatus] = useState<StageRecord["status"]>("pass"),
    [reason, setReason] = useState(""),
    [evidence, setEvidence] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const scope = {
    channel: content.channel,
    contentId: content.id,
    account: content.account,
    assignedTo: content.assignedTo,
  };
  function allowed(stage: StageKey) {
    if (stage === "human_approval" || stage === "publication_record")
      return false;
    const action =
      stage === "handoff"
        ? "schedule.manage"
        : stage === "intake" || stage === "creation"
          ? "content.edit"
          : "stage.review";
    return (
      can(state, actor, action, scope) ||
      (action === "stage.review" && can(state, actor, "package.approve", scope))
    );
  }
  async function decide(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await send({
        type: "stage.decide",
        contentId: content.id,
        stage: selected,
        status,
        reason,
        evidence,
        expectedRevision: content.revision,
        expectedWorkflowId: currentWorkflow(content, state)?.id,
        expectedRuleVersion: state.settings.protectedVersion,
        packageId: selected === "handoff" ? summary.packageId : undefined,
      });
      if (result === false) return;
      setSelected(null);
      setReason("");
      setEvidence("");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not record the check.";
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="s-stage-tracker">
      <summary>
        <ShieldCheck size={17} />
        <strong>Editorial workflow</strong>
        <span>{summary.completed} / 9 complete</span>
        <ChevronDown size={15} />
      </summary>
      <p className="s-stage-intro">
        Every item follows the same nine stages. Checks record the actual person
        and evidence; they never imply that an agent ran. Changes reopen only
        affected checks.
      </p>
      <ol>
        {summary.stages.map((stage, i) => (
          <li
            key={stage.key}
            data-stage={stage.key}
            className={`s-stage s-stage-${stage.status}`}
          >
            <span className="s-stage-number">
              {stage.status === "pass" || stage.status === "na" ? (
                <CheckCircle2 size={17} />
              ) : (
                i + 1
              )}
            </span>
            <div>
              <strong>{stage.title}</strong>
              <p>{stage.purpose}</p>
              <small>
                {stage.stale
                  ? "Check needs renewal for the current version."
                  : stage.record
                    ? `${stage.record.actor === content.createdBy && state.members.find((m) => m.email === stage.record?.actor)?.roles.includes("founder") ? "Founder self-review" : "Human-recorded check"} · ${stage.record.actor}`
                    : stage.key === "human_approval"
                      ? state.settings.reviewPolicy?.mode==="two_step"?"Open Reviews, approve the copy, then use Approve final package after all required checks pass.":"Use Approve revision after all required checks pass."
                      : stage.key === "publication_record"
                        ? "Recorded only after a person confirms the selected package and live URL."
                        : stage.criteria}
              </small>
              {stage.record?.reason && (
                <p className="s-stage-reason">{stage.record.reason}</p>
              )}
            </div>
            <span className="s-stage-status">
              {stage.status === "na" ? "N/A" : stage.status}
            </span>
            {allowed(stage.key) && (
              <button
                type="button"
                className="s-btn s-small-btn"
                aria-label={`Record ${stage.title} check`}
                onClick={() => {
                  setSelected(stage.key);
                  setStatus("pass");
                  setReason("");
                  setEvidence("");
                  setError("");
                }}
              >
                Record check
              </button>
            )}
          </li>
        ))}
      </ol>
      {selected && (
        <form className="s-stage-form" onSubmit={decide}>
          <h3>
            Record {summary.stages.find((s) => s.key === selected)?.title}
          </h3>
          <label>
            Decision
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as StageRecord["status"])
              }
            >
              <option value="pass">Pass</option>
              <option value="revise">Revise</option>
              <option value="hold">Hold</option>
              {selected === "visual_review" && !hasVisuals(content) && (
                <option value="na">Not applicable — text only</option>
              )}
            </select>
          </label>
          <label>
            Reason / finding
            <textarea
              required
              minLength={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What was checked, and why does this result apply?"
            />
          </label>
          <label>
            Evidence / reviewer reference
            <textarea
              required={[
                "evidence",
                "independent_review",
                "release_check",
              ].includes(selected)}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Source links, review findings, selected source identity, or a reasoned no-external-claims declaration. Do not claim an agent review without its actual result."
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="s-actions">
            <button
              className="s-btn"
              type="button"
              onClick={() => setSelected(null)}
            >
              Cancel check
            </button>
            <button className="s-btn s-primary" disabled={busy}>
              {busy ? "Saving check…" : "Save check"}
            </button>
          </div>
        </form>
      )}
    </details>
  );
}

/** The normal editor exposes status, never a manual nine-stage checklist. */
export function StageTracker({content,state}: {content:Content;state:StudioState;actor:Actor;send:(command:Command)=>Promise<unknown>;onError?:(message:string)=>void}) {
  const approved=state.packages.some(p=>p.contentId===content.id&&p.revision===content.revision);
  const job=state.jobs.find(j=>j.id===content.automaticReview?.jobId);
  const status=approved?"Approved for publication":content.state!=="review"?"Create your content, then submit for review":content.agentReview?"Checks complete — open Reviews":job?.state==="running"?"Automatic review in progress":job?.state==="queued"?"Automatic review queued":"Open Reviews to check or override findings";
  return <div className="s-info-strip" role="status"><ShieldCheck size={17}/><span>{status}</span></div>;
}
