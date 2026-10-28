import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState, persist, hash } from "@/lib/studio/store";
import {
  StudioError,
  requirePermission,
  filteredState,
} from "@/lib/studio/permissions";
import { readGoogleDocument } from "@/lib/studio/google";
import { applyCommand } from "@/lib/studio/engine";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor),
      body = await req.json(),
      d = state.contents.find((x) => x.id === body.contentId);
    if (!d) throw new StudioError(404, "Draft not found.");
    requirePermission(state, actor, "content.edit", {
      channel: d.channel,
      contentId: d.id,
      account: d.account,
      assignedTo: d.assignedTo,
    });
    if (!d.docId)
      throw new StudioError(400, "Link a Google document ID first.");
    if (
      (body.expectedDocId && body.expectedDocId !== d.docId) ||
      (body.expectedRevision !== undefined &&
        body.expectedRevision !== d.revision)
    )
      throw new StudioError(
        409,
        "Linked document or draft changed. Reload before fetching.",
      );
    const text = await readGoogleDocument(db, actor.id, d.docId);
    const next = applyCommand(
      state,
      actor,
      {
        type: "docs.import",
        contentId: d.id,
        text,
        expectedRevision: d.revision,
      },
      { hash },
    );
    const imported = next.contents.find((c) => c.id === d.id)!;
    imported.docsOwnerId = actor.id;
    imported.docsOwnerEmail = actor.email;
    await persist(db, state, next);
    return NextResponse.json({
      state: filteredState(next, actor),
      actor,
      mode: "live",
    });
  } catch (e) {
    return failure(e);
  }
}
