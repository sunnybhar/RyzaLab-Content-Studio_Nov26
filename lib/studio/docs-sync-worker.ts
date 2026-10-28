import type { StudioState } from "./types";
import { can } from "./permissions";
import { readGoogleDocument } from "./google";
import { persist, type database } from "./store";
import { syncGoogleText } from "./docs-sync";
export async function syncOneGoogleDoc(
  db: ReturnType<typeof database>,
  state: StudioState,
  now = new Date().toISOString(),
) {
  if (state.settings.docsMode !== "automatic")
    return { checked: false, reason: "manual_mode" };
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return { checked: false, reason: "google_not_configured" };
  const d = state.contents.find(
    (c) =>
      !c.deletedAt &&
      c.docId &&
      c.docsOwnerId &&
      c.docsOwnerEmail &&
      c.docsFetchedAt &&
      Date.parse(c.docsLastCheckedAt || c.docsFetchedAt) <
        Date.parse(now) - 300000 &&
      can(
        state,
        { id: c.docsOwnerId!, email: c.docsOwnerEmail! },
        "content.edit",
        {
          contentId: c.id,
          channel: c.channel,
          account: c.account,
          assignedTo: c.assignedTo,
        },
      ),
  );
  if (!d) return { checked: false, reason: "no_document_due" };
  const actor = { id: d.docsOwnerId!, email: d.docsOwnerEmail! };
  if (
    !can(state, actor, "content.edit", {
      contentId: d.id,
      channel: d.channel,
      account: d.account,
      assignedTo: d.assignedTo,
    })
  )
    return { checked: false, reason: "owner_not_authorized" };
  let text: string;
  try {
    text = await readGoogleDocument(db, actor.id, d.docId!);
  } catch {
    const next = structuredClone(state),
      copy = next.contents.find((c) => c.id === d.id)!;
    const message =
      "Google Docs automatic check failed. Check sharing and reconnect the linked owner account.";
    copy.docsLastCheckedAt = now;
    if (copy.docsSyncError !== message) {
      next.notices.push({
        id: crypto.randomUUID(),
        user: actor.email,
        title: "Google Docs sync needs attention",
        body: d.title,
        eventId: `docs-sync:${d.id}:${d.revision}`,
        createdAt: now,
        read: false,
        emailState: "not_configured",
      });
    }
    copy.docsSyncError = message;
    next.version++;
    await persist(db, state, next);
    return { checked: true, status: "failed" };
  }
  const next = syncGoogleText(state, actor, d.id, d.revision, text, now);
  await persist(db, state, next);
  return {
    checked: true,
    status: next.contents.find((c) => c.id === d.id)?.docsIncoming
      ? "conflict"
      : "checked",
  };
}
