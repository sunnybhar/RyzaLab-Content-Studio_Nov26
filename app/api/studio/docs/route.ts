import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState, persist, hash } from "@/lib/studio/store";
import {
  StudioError,
  requirePermission,
  filteredState,
} from "@/lib/studio/permissions";
import { googleAccess } from "@/lib/studio/google";
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
    const token = await googleAccess(db, actor.id),
      response = await fetch(
        `https://docs.googleapis.com/v1/documents/${encodeURIComponent(d.docId)}?includeTabsContent=true`,
        {
          headers: { authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        },
      );
    if (!response.ok)
      throw new StudioError(
        response.status === 403 ? 403 : 502,
        "Could not read this Google Doc. Check sharing, permissions, and the document ID.",
      );
    const document = await response.json();
    const parts: string[] = [];
    function collect(value: unknown) {
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if (node.textRun && typeof node.textRun === "object") {
        const text = (node.textRun as { content?: string }).content;
        if (text) parts.push(text);
        return;
      }
      for (const v of Object.values(node)) {
        if (Array.isArray(v)) v.forEach(collect);
        else if (v && typeof v === "object") collect(v);
      }
    }
    collect(document.tabs?.length ? document.tabs : document.body);
    const text = parts.join("");
    if (text.length > 60000)
      throw new StudioError(
        413,
        "Google document exceeds the current draft text limit.",
      );
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
