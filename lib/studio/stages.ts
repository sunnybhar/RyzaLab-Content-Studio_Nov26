import type { Content, StudioState, StageKey, StageRecord } from "./types";
export const STAGE_DEFINITIONS: {
  key: StageKey;
  title: string;
  purpose: string;
  owner: string;
  criteria: string;
}[] = [
  {
    key: "intake",
    title: "Intake",
    purpose: "Confirm the brief, audience, channel and selected source.",
    owner: "Creator / editor",
    criteria: "A clear topic, target and current source are recorded.",
  },
  {
    key: "evidence",
    title: "Evidence",
    purpose: "Check factual claims, sources, provenance and permissions.",
    owner: "Editor / reviewer",
    criteria:
      "External facts are supported; unresolved claims are revised or held. Record when the piece has no external factual claims.",
  },
  {
    key: "creation",
    title: "Creation",
    purpose: "Write or generate the draft and prepare required media.",
    owner: "Creator / editor",
    criteria: "The intended text, metadata and media are present for review.",
  },
  {
    key: "independent_review",
    title: "Independent review",
    purpose: "Record accuracy, voice and channel review evidence.",
    owner: "Reviewer / founder",
    criteria:
      "Record the reviewer/source and findings. A human-recorded attestation is not an automatically verified agent review.",
  },
  {
    key: "visual_review",
    title: "Visual review",
    purpose: "Inspect images, slides, video, captions and crops.",
    owner: "Reviewer / founder",
    criteria:
      "All selected visuals are inspected. N/A is permitted only for a genuinely text-only item, with a reason.",
  },
  {
    key: "release_check",
    title: "Release check",
    purpose:
      "Check the exact text, media, metadata and active policy together.",
    owner: "Reviewer / founder",
    criteria:
      "Prior checks are current for this version; factual and policy blockers remain non-overridable.",
  },
  {
    key: "human_approval",
    title: "Human approval",
    purpose: "Accept, reject or request changes on the complete package.",
    owner: "Authorized human approver",
    criteria:
      "Created only by explicit package approval after required checks pass.",
  },
  {
    key: "handoff",
    title: "Publication handoff",
    purpose: "Prepare the exact approved package for human publication.",
    owner: "Publisher / founder",
    criteria:
      "Record that the selected approved package is ready to copy/export; this does not publish it.",
  },
  {
    key: "publication_record",
    title: "Publication record",
    purpose: "Record the human publication URL, identity and time.",
    owner: "Human publisher",
    criteria:
      "Created only by explicit confirmation against the selected approved package; never inferred from scheduling.",
  },
];
export function hasVisuals(c: Content) {
  return Boolean(
    c.media.imageUrl ||
    c.media.sectionImages?.length ||
    c.media.slides.length ||
    c.media.scenes.length ||
    /video|reel|short|carousel|image|photo|thumbnail|visual|document slide/i.test(
      c.format,
    ),
  );
}
export function currentWorkflow(c: Content, s: StudioState) {
  return s.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  );
}
export function recordIsCurrent(
  record: StageRecord,
  c: Content,
  s: StudioState,
) {
  const shared =
    record.ruleVersion === s.settings.protectedVersion &&
    record.workflowId === currentWorkflow(c, s)?.id;
  if (!shared) return false;
  if (record.key === "intake") return true;
  if (record.key === "visual_review")
    return (
      record.mediaRevision === (c.mediaRevision || 1) &&
      !(record.status === "na" && hasVisuals(c))
    );
  if (record.key === "evidence")
    return (
      (record.factsRevision ?? record.textRevision) ===
      (c.factsRevision ?? c.textRevision ?? 1)
    );
  return (
    record.textRevision === (c.textRevision || 1) &&
    record.mediaRevision === (c.mediaRevision || 1)
  );
}
export function stageSummary(c: Content, s: StudioState) {
  const pkg = s.packages.find(
      (p) => p.contentId === c.id && p.revision === c.revision,
    ),
    publication = s.schedules.find(
      (t) =>
        t.contentId === c.id &&
        t.packageId === pkg?.id &&
        t.state === "published",
    );
  const stages = STAGE_DEFINITIONS.map((def) => {
    const records = (c.stages || []).filter((r) => r.key === def.key),
      record = [...records].reverse().find((r) => recordIsCurrent(r, c, s));
    let status: StageRecord["status"] = record?.status || "pending";
    if (def.key === "human_approval") status = pkg ? "pass" : "pending";
    if (def.key === "publication_record")
      status = publication ? "pass" : "pending";
    if (def.key === "handoff" && (!pkg || record?.packageId !== pkg.id))
      status = "pending";
    return { ...def, status, record, stale: records.length > 0 && !record };
  });
  const first = stages.find((x) => !["pass", "na"].includes(x.status)),
    completed = stages.filter((x) => ["pass", "na"].includes(x.status)).length;
  const bucket = publication
    ? "Published"
    : pkg
      ? "Ready to export"
      : c.state === "review"
        ? "Human review"
        : "Drafting";
  return {
    stages,
    current: first?.key || "publication_record",
    label: first?.title || "Published",
    completed,
    total: 9,
    readyForApproval: stages
      .slice(0, 6)
      .every(
        (x) =>
          x.status === "pass" ||
          (x.key === "visual_review" && x.status === "na"),
      ),
    bucket,
    packageId: pkg?.id,
  };
}

export function factsSignature(
  c: Pick<Content, "text" | "title" | "metadata" | "media">,
) {
  return JSON.stringify({
    text: c.text,
    title: c.title,
    metadata: c.metadata,
    image: c.media.imageUrl,
    ...(c.media.imageAlt?{imageAlt:c.media.imageAlt}:{}),
    ...(c.media.imageCaption?{imageCaption:c.media.imageCaption}:{}),
    ...(c.media.sectionImages?.length?{sectionImages:c.media.sectionImages}:{}),
    slides: c.media.slides.map((s) => ({
      title: s.title,
      body: s.body,
      image: s.image,
      textLayers: (s.layers || [])
        .filter((l) => l.kind === "text")
        .map((l) => ({ id: l.id, text: l.kind === "text" ? l.text : "" }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    })),
    scenes: c.media.scenes.map((s) => ({
      title: s.title,
      script: s.script,
      source: s.sourceUrl,
      audio: s.audioUrl,
    })),
    narration: c.media.narration,
    captions: c.media.captions,
  });
}
