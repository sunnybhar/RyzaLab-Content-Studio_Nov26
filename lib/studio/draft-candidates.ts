import type { Content, Job, StudioState } from "./types";
import {
  draftResultSchema,
  parseOutput,
  reviewResultSchema,
} from "./output-contracts";
import { copyIdentity, currentCopyAcceptance } from "./solo-quality";
import { can } from "./permissions";
import { factsSignature } from "./stages";
export function applyDraftCandidate(
  content: Content,
  job: Job,
  actor: string,
  now: string,
  id: () => string,
  unresolvedQuestions = false,
) {
  if (!job.candidate)
    throw new Error("No parsed draft candidate is available.");
  const beforeFacts = factsSignature(content),
    result = job.candidate;
  content.history.push({
    id: id(),
    title: content.title,
    text: content.text,
    metadata: content.metadata,
    media: structuredClone(content.media),
    createdBy: actor,
    createdAt: now,
    reason: `Agent candidate ${job.id}; prior working copy retained`,
  });
  content.revision++;
  content.textRevision = (content.textRevision || 1) + 1;
  content.text = result.body;
  content.metadata = [result.metadata, ...(unresolvedQuestions ? result.questions.map(q => `[Confirm: ${q}]`) : [])].filter(Boolean).join("\n\n");
  if (result.slides?.length && !content.media.slides.length) {
    content.media.slides = result.slides.map((slide, i) => ({
      ...content.media.slides[i],
      ...slide,
      id: content.media.slides[i]?.id || id(),
      color: content.media.slides[i]?.color || "#173c43",
      background: content.media.slides[i]?.background || "#f5f8f8",
      x: 10,
      y: 15,
      fontSize: 54,
    }));
    content.mediaRevision = (content.mediaRevision || 1) + 1;
  }
  if (beforeFacts !== factsSignature(content))
    content.factsRevision =
      (content.factsRevision ?? content.textRevision - 1) + 1;
  content.state = "draft";
  content.updatedAt = now;
  if (job.connectionSnapshot)
    content.generatedBy = {
      provider: job.connectionSnapshot.provider,
      model: job.connectionSnapshot.model,
      jobId: job.id,
    };
  job.appliedAt = now;
  job.appliedRevision = content.revision;
  job.outputStatus = "applied";
}
export function settleWrittenOutput(
  state: StudioState,
  job: Job,
  output: { text?: string; completion?: "complete" | "incomplete" | "refused" },
  now: string,
  id = () => crypto.randomUUID(),
) {
  if (job.appliedAt || !job.outputContract) return;
  const c = state.contents.find((c) => c.id === job.contentId);
  const member = state.members.find(
    (m) => m.email === job.createdBy && !m.revoked,
  );
  const actor = member ? { id: member.id, email: member.email } : undefined;
  const scope = {
    channel: job.channel,
    function: job.kind,
    contentId: job.contentId,
    account: job.account,
    assignedTo: c?.assignedTo,
  };
  if (
    !c ||
    !actor ||
    !can(state, actor, "read", scope) ||
    !can(state, actor, "job.create", scope) ||
    (job.kind === "text" && !can(state, actor, "content.edit", scope))
  ) {
    job.outputStatus = "conflict";
    job.error =
      "Source access changed. Result retained without altering the draft or current review.";
    return;
  }
  if (
    output.completion !== "complete" ||
    /\[INCOMPLETE OUTPUT/i.test(output.text || "")
  ) {
    job.outputStatus = "incomplete";
    job.error =
      "Output is incomplete. The saved response and budget reservation are retained; no automatic retry or draft replacement.";
    return;
  }
  if (job.outputContract === "draft_v1") {
    try {
      job.candidate = parseOutput(output.text || "", draftResultSchema);
    } catch {
      job.outputStatus = "invalid";
      job.error =
        "The result does not match the selected-piece format. Raw response retained; no copy was replaced.";
      return;
    }
    job.outputStatus = "ready";
    if (job.candidate.questions.length) {
      job.error =
        "The candidate has unresolved factual questions. Review them before applying it: " +
        job.candidate.questions.join(" ").slice(0, 3000);
      return;
    }
    if (
      !c ||
      c.deletedAt ||
      c.revision !== job.targetRevision ||
      copyIdentity(c, state) !== job.targetIdentity ||
      c.state !== "draft" ||
      currentCopyAcceptance(c, state) ||
      job.targetAccepted
    ) {
      job.outputStatus = "conflict";
      job.error =
        "Your working version changed or is protected. Review this candidate beside your current draft; nothing was overwritten.";
      return;
    }
    applyDraftCandidate(c, job, job.createdBy, now, id);
  } else {
    let report;
    try {
      report = parseOutput(output.text || "", reviewResultSchema);
    } catch {
      job.outputStatus = "invalid";
      job.error =
        "Reviewer response was not a valid report; required review remains pending.";
      return;
    }
    const workflow = job.workflowSnapshot;
    if (
      report.issues.some((i) =>
        i.referenceIds.some((id) => !workflow?.references.includes(id)),
      )
    ) {
      job.outputStatus = "invalid";
      job.error =
        "Reviewer cited an unprovided reference; no factual verification is claimed.";
      return;
    }
    if (!c || c.deletedAt || copyIdentity(c, state) !== job.targetIdentity) {
      job.outputStatus = "conflict";
      job.error =
        "Review applies to an earlier copy version; no current report was attached.";
      return;
    }
    if (!job.connectionSnapshot) {
      job.outputStatus = "invalid";
      job.error = "Reviewer provenance is missing.";
      return;
    }
    c.agentReview = {
      ...report,
      identity: job.targetIdentity!,
      jobId: job.id,
      provider: job.connectionSnapshot.provider,
      model: job.connectionSnapshot.model,
      independent: Boolean(
        c.generatedBy &&
        c.generatedBy.provider !== job.connectionSnapshot.provider,
      ),
      at: now,
      context: "provided_references",
    };
    job.outputStatus = "ready";
  }
}
