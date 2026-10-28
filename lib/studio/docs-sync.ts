import type { Actor, StudioState } from "./types";
import { can, StudioError } from "./permissions";
import { applyCommand } from "./engine";
export function syncGoogleText(
  input: StudioState,
  actor: Actor,
  contentId: string,
  expectedRevision: number,
  text: string,
  now: string,
) {
  const original = input.contents.find((c) => c.id === contentId);
  if (!original || original.deletedAt)
    throw new StudioError(404, "Linked draft unavailable.");
  if (original.revision !== expectedRevision)
    throw new StudioError(
      409,
      "Draft changed while checking Google Docs; no edits imported.",
    );
  if (text.length > 60000)
    throw new StudioError(413, "Document exceeds the draft limit.");
  if (
    !can(input, actor, "content.edit", {
      contentId,
      channel: original.channel,
      account: original.account,
      assignedTo: original.assignedTo,
    })
  )
    throw new StudioError(
      403,
      "Document owner no longer has editing authority.",
    );
  if (
    original.docsOwnerId !== actor.id ||
    original.docsOwnerEmail !== actor.email ||
    !original.docId ||
    !original.docsFetchedAt ||
    original.docsBase === undefined
  )
    throw new StudioError(
      400,
      "Link and manually fetch this Google Doc before enabling automatic sync.",
    );
  let next = structuredClone(input);
  let d = next.contents.find((c) => c.id === contentId)!;
  const changed = text !== d.docsBase;
  const protectedVersion =
    d.state !== "draft" ||
    next.packages.some(
      (p) => p.contentId === d.id && p.revision === d.revision,
    );
  if (changed && (d.text !== d.docsBase || protectedVersion)) {
    if (d.docsIncoming && d.docsIncoming.text !== text)
      d.history.push({
        id: crypto.randomUUID(),
        text: d.docsIncoming.text,
        title: d.title,
        metadata: d.metadata,
        media: structuredClone(d.media),
        createdBy: actor.email,
        createdAt: d.docsIncoming.fetchedAt,
        reason:
          "Previous Google Docs conflict branch retained; not a Studio approval",
      });
    d.docsIncoming = {
      text,
      fetchedAt: now,
      reason: protectedVersion
        ? "Current version is in review or approved. Human import required."
        : "Studio and Google Docs both changed. Compare both versions before importing.",
    };
  } else if (changed) {
    next = applyCommand(
      input,
      actor,
      { type: "docs.import", contentId, text, expectedRevision },
      { now },
    );
    d = next.contents.find((c) => c.id === contentId)!;
  } else if (d.docsIncoming) {
    d.history.push({
      id: crypto.randomUUID(),
      text: d.docsIncoming.text,
      title: d.title,
      metadata: structuredClone(d.metadata),
      media: structuredClone(d.media),
      createdBy: actor.email,
      createdAt: d.docsIncoming.fetchedAt,
      reason:
        "Google incoming branch retained after remote reversion to baseline",
    });
    delete d.docsIncoming;
  }
  d.docsLastCheckedAt = now;
  delete d.docsSyncError;
  if (next.version === input.version) {
    next.version++;
    next.audit.push({
      id: crypto.randomUUID(),
      actor: actor.email,
      action: changed ? "docs.sync_conflict" : "docs.sync_checked",
      target: contentId,
      at: now,
    });
  }
  if (Buffer.byteLength(JSON.stringify(next)) > 24000000)
    throw new StudioError(
      413,
      "History limit reached. Automatic sync held; use manual fetch after archiving.",
    );
  return next;
}
