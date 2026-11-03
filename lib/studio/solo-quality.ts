import type { Content, StudioState } from "./types";
import { currentWorkflow, hasVisuals } from "./stages";
import { contentWording } from "./content-wording";
import { review } from "../brand";
import { StudioError } from "./permissions";
import { confirmationMarkers } from "./input-requirements";

export function soloPolicy(state: StudioState) {
  const policy = state.settings.reviewPolicy;
  if (policy && policy.mode !== "two_step")
    throw new StudioError(
      409,
      "Review policy is not recognized; ask the founder to review setup.",
    );
  return policy;
}
export function copyIdentity(c: Content, s: StudioState) {
  const workflow = currentWorkflow(c, s);
  return JSON.stringify({
    contentId: c.id,
    textRevision: c.textRevision || 1,
    title: c.title,
    text: c.text,
    metadata: c.metadata,
    channel: c.channel,
    account: c.account,
    format: c.format,
    newsletterSource: c.newsletterSource,
    researchJobIds: c.researchJobIds,
    words: contentWording(c),
    workflow: workflow?.id,
    activation: workflow?.activationId || workflow?.createdAt,
    rules: s.settings.protectedVersion,
    policy: s.settings.reviewPolicy?.version,
    references: s.references
      .filter((r) => workflow?.references.includes(r.id))
      .map((r) => ({
        id: r.id,
        content: r.content,
        kind: r.kind,
        channel: r.channel,
      })),
  });
}
export function currentCopyAcceptance(c: Content, s: StudioState) {
  const identity = copyIdentity(c, s);
  return [...(c.copyAcceptances || [])]
    .reverse()
    .find(
      (a) =>
        a.identity === identity &&
        a.policyVersion === s.settings.reviewPolicy?.version,
    );
}
export function copyBlockers(c: Content) {
  const words = contentWording(c);
  const issues = review(words, "general")
    .issues.filter((i) => i.severity === "BLOCK")
    .map((i) => i.message);
  for (const m of confirmationMarkers(words))
    issues.push(`Resolve ${m.text.slice(0, 300)}`);
  if (/\bNEEDS_SOURCE\b|\[INCOMPLETE OUTPUT|\[INVALID OUTPUT/i.test(words))
    issues.push(
      "The output is incomplete or needs source evidence. Retain the response and finish the draft before approval.",
    );
  if (!c.text.trim()) issues.push("Add the complete written copy.");
  return [...new Set(issues)];
}
export function packageReadiness(c: Content, s: StudioState, singleReview = false) {
  const policy = soloPolicy(s),
    acceptance = currentCopyAcceptance(c, s),
    identity = copyIdentity(c, s);
  const blockers = copyBlockers(c);
  if (!singleReview && !acceptance) blockers.push("Review and approve the current copy first.");
  if (
    s.jobs.some(
      (j) =>
        j.contentId === c.id &&
        ["awaiting_confirmation", "queued", "running", "unknown"].includes(
          j.state,
        ),
    )
  )
    blockers.push(
      "Generation or review is still pending or uncertain. Resolve it before final approval.",
    );
  const workflow = currentWorkflow(c, s);
  if (!workflow) blockers.push("Select an active channel setup.");
  if (
    /video|reel|short/i.test(c.format) &&
    (!c.media.scenes.length || c.media.scenes.some((x) => !x.sourceUrl))
  )
    blockers.push("Complete the video scenes before final review.");
  if (/carousel|document slide/i.test(c.format) && !c.media.slides.length)
    blockers.push("Prepare the carousel slides.");
  if (/image|photo|thumbnail/i.test(c.format) && !c.media.imageUrl)
    blockers.push("Prepare the final image.");
  const agent =
    c.agentReview?.identity === identity ? c.agentReview : undefined;
  if (policy?.autoReview && !agent)
    blockers.push("The configured automatic textual review must finish and attach a current report before final approval.");
  const needsIndependent =
    c.channel === "Notes" || Boolean(policy?.requireIndependentReview);
  if (needsIndependent && !agent?.independent)
    blockers.push(
      "This policy requires a current independent AI review from a different qualified provider before release.",
    );
  if (agent)
    blockers.push(
      ...agent.issues
        .filter((i) => i.severity === "block")
        .map((i) => `Reviewer finding: ${i.message}`),
    );
  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)],
    acceptance,
    agent,
    visual: hasVisuals(c),
    checks: [
      {
        label: "Completion and placeholders",
        status: copyBlockers(c).length ? "needs_input" : "checked_by_rule",
        detail: "Scanned current copy; this is not fact verification.",
      },
      {
        label: "Source review",
        status: acceptance ? "human_accepted" : "needs_human_review",
        detail:
          acceptance?.evidence ||
          singleReview ? "Check factual claims and attached sources in your final review." : "Review factual claims against attached sources when approving copy.",
      },
      {
        label: "AI textual review",
        status: agent ? "agent_report" : "not_run",
        detail: agent
          ? `${agent.provider} · ${agent.model} · ${agent.independent ? "separate provider" : "second pass, not independent"}`
          : "No AI reviewer result is claimed. Human final review remains required.",
      },
      {
        label: "Visual inspection",
        status: hasVisuals(c) ? "needs_human_review" : "not_applicable",
        detail: hasVisuals(c)
          ? "Inspect all actual assets in final review."
          : "Text-only package.",
      },
    ],
  };
}
export function resolvedConnection(
  s: StudioState,
  channel: string,
  kind: string,
) {
  const w = s.workflows.find(
    (w) => w.channel === channel && w.status === "active",
  );
  const key = kind as keyof NonNullable<typeof w>["functionConnections"];
  return (
    w?.functionConnections?.[key] ||
    (kind === "text" ? w?.connectionId : "") ||
    s.settings.defaultConnections?.[
      kind as keyof NonNullable<StudioState["settings"]["defaultConnections"]>
    ] ||
    ""
  );
}
