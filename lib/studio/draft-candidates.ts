import {jobHasExcludedSupport,containsExcludedSource} from "./source-policy";
import {suppliedReviewReferences} from "./review-references";
import {correctionIsCurrent} from "./review-correction";
import {isLongForm, newsletterTemplateFromPrompt} from "./channel-writing";
import {incompleteDraftBody,applyRecoveredWorkingText} from "./incomplete-draft";
import { retainNewsletterLinks } from "./newsletter-source";
import { newsletterStructureIssue } from "./newsletter-outline";
import type { Content, Job, StudioState } from "./types";
import {
  draftResultSchema,
  parseOutput,
  reviewResultSchema,
} from "./output-contracts";
import { copyIdentity, currentCopyAcceptance } from "./solo-quality";
import { can } from "./permissions";
import { factsSignature } from "./stages";
import { researchSourcesCurrent } from "./research-link";
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
  if(isLongForm(content.channel,content.format)&&result.sources.length&&!/^#{0,3}\s*(Sources|References)\s*:?$/im.test(result.body))content.text+="\n\n## Sources\n"+result.sources.map(source=>`- ${source}`).join("\n");
  if(result.imageBrief&&!content.media.imagePrompt){content.media.imagePrompt=result.imageBrief;content.mediaRevision=(content.mediaRevision||1)+1;}

  content.researchJobIds = job.researchJobIds;
  if(result.imageCaptions?.length){
    for(const image of result.imageCaptions){
      if(image.imageId==="hero"&&content.media.imageUrl){content.media.imageAlt=image.alt;content.media.imageCaption=image.caption;}
      else content.media.sectionImages=content.media.sectionImages?.map(existing=>existing.id===image.imageId?{...existing,alt:image.alt,caption:image.caption}:existing);
    }
    content.mediaRevision=(content.mediaRevision||1)+1;
  }
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
  if(jobHasExcludedSupport(job)){job.outputStatus="conflict";job.error="Saved work contains excluded historical source evidence. It was retained without changing current copy or claiming a fresh review.";return;}
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
  if(!researchSourcesCurrent(state,actor!,job)) {job.outputStatus="conflict";job.error="Research evidence or access changed. Result retained without replacing the draft or review report.";return;}
  if (
    output.completion !== "complete" ||
    /\[INCOMPLETE OUTPUT/i.test(output.text || "")
  ) {
    if(job.outputContract==="draft_v1"&&output.completion!=="refused"&&!c.deletedAt&&c.state==="draft"&&!c.text.trim()&&c.revision===job.targetRevision&&copyIdentity(c,state)===job.targetIdentity&&!currentCopyAcceptance(c,state)&&!job.targetAccepted) {
      const body=incompleteDraftBody(output.text||"");if(body){applyRecoveredWorkingText(c,job,body,job.createdBy,now,id);return;}
    }
    job.outputStatus = "incomplete";
    job.error =
      "Output is incomplete. The saved response is retained; no automatic retry or draft replacement.";
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
    if([job.candidate.body,job.candidate.metadata,...job.candidate.sources,...(job.candidate.imageCaptions||[]).flatMap(image=>[image.alt,image.caption])].some(containsExcludedSource)){job.outputStatus="invalid";job.error="The candidate includes an excluded Wikipedia source URL. Original copy and saved output were retained; no automatic paid retry.";return;}
    if (c.channel === "Newsletter") {
      // Older saved writing requests may have a plain text prompt.
      let links: string[] = [];
      try {
        const values: unknown = JSON.parse(job.prompt || "{}")?.newsletterSourceLinks;
        if (Array.isArray(values)) links = values.filter((value): value is string => typeof value === "string");
      } catch {}
      job.candidate.body = retainNewsletterLinks(job.candidate.body, links);
    }
    if(job.candidate.imageCaptions?.some(image=>!(image.imageId==="hero"&&c.media.imageUrl)&&!c.media.sectionImages?.some(existing=>existing.id===image.imageId))){job.outputStatus="invalid";job.error="The candidate referenced an image that was not supplied. Original copy and assets were preserved.";return;}
    const template = c.channel === "Newsletter" ? newsletterTemplateFromPrompt(job.prompt) : undefined;
    if (template) {
      const issue = newsletterStructureIssue(template.sections, job.candidate.body);
      if (issue) job.candidate.questions.push(issue);
    } else if(isLongForm(c.channel,c.format)){
      const minWords=/blog/i.test(c.format)?800:1600;
      if(job.candidate.body.trim().split(/\s+/).length<minWords)job.candidate.questions.push(`Expand this ${/blog/i.test(c.format)?"blog":"newsletter"} to at least ${minWords.toLocaleString("en-US")} substantive words with background, evidence, reasoning and practical guidance before review.`);
      if(!job.candidate.sources.length&&!/^#{0,3}\s*(Sources|References)\s*:?$/im.test(job.candidate.body))job.candidate.questions.push("Add relevant source citations and a readable Sources section for this article before review.");
    }
    job.outputStatus = "ready";
    if (job.candidate.questions.length) {
      job.error =
        "The draft has unresolved factual questions. Answer the confirmation markers before approval: " +
        job.candidate.questions.join(" ").slice(0, 3000);
      // An untouched empty editor can receive an unfinished working draft.
      // Existing human copy still needs explicit comparison before replacement.
      if (c.text.trim() || template) return;
    }
    const correction=Boolean(job.reviewCorrection&&correctionIsCurrent(state,c,job));
    if (
      !c ||
      c.deletedAt ||
      c.revision !== job.targetRevision ||
      copyIdentity(c, state) !== job.targetIdentity ||
      (c.state !== "draft" && !correction) ||
      currentCopyAcceptance(c, state) ||
      job.targetAccepted
    ) {
      job.outputStatus = "conflict";
      job.error =
        "Your working version changed or is protected. Review this candidate beside your current draft; nothing was overwritten.";
      return;
    }
    if(job.reviewCorrection&&!correction){job.outputStatus="conflict";job.error="Correction context changed or this version was approved. Saved candidate did not replace it.";return;}
    applyDraftCandidate(c, job, job.createdBy, now, id, Boolean(job.candidate.questions.length));
    if(job.reviewCorrection){
      c.state="review";
      c.reviewSubmission={id:id(),rootId:job.reviewCorrection.rootSubmissionId,actor:job.createdBy,identity:copyIdentity(c,state),at:now};
      c.reviewCycle={rootSubmissionId:job.reviewCorrection.rootSubmissionId,rounds:job.reviewCorrection.round,status:"reviewing",jobId:job.id,at:now};
    }
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
    const references = suppliedReviewReferences(job);
    if (
      report.issues.some((i) =>
        i.referenceIds.some((id) => !references.has(id)),
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
    if(c.reviewCycle)c.reviewCycle={...c.reviewCycle,status:report.issues.length?"needs_input":"ready",reason:undefined,at:now};
    job.outputStatus = "ready";
  }
}
