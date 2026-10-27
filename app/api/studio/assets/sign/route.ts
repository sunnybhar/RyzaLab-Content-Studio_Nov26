import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState } from "@/lib/studio/store";
import { requirePermission, StudioError } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor),
      input = z
        .object({
          contentId: z.string().min(1),
          name: z.string().min(1).max(200),
          mime: z.enum([
            "image/png",
            "image/jpeg",
            "image/webp",
            "video/mp4",
            "audio/mpeg",
            "audio/wav",
          ]),
          size: z
            .number()
            .int()
            .positive()
            .max(50 * 1024 * 1024),
        })
        .strict()
        .parse(await req.json()),
      d = state.contents.find((x) => x.id === input.contentId);
    if (!d || d.deletedAt)
      throw new StudioError(404, "Active draft not found.");
    requirePermission(state, actor, "content.edit", {
      channel: d.channel,
      account: d.account,
      contentId: d.id,
      assignedTo: d.assignedTo,
    });
    const id = crypto.randomUUID(),
      path = `${d.id}/${id}`,
      { data, error } = await db.storage
        .from("studio-assets")
        .createSignedUploadUrl(path, { upsert: false });
    if (error || !data)
      throw new StudioError(503, "Private media storage is not configured.");
    const { error: recordError } = await db
      .from("studio_assets")
      .insert({
        id,
        content_id: d.id,
        object_path: path,
        uploaded_by: actor.id,
        mime: input.mime,
        name: input.name,
      });
    if (recordError)
      throw new StudioError(503, "Asset record could not be created.");
    return NextResponse.json({
      id,
      path,
      token: data.token,
      url: `/api/studio/assets?id=${id}`,
    });
  } catch (e) {
    return failure(e);
  }
}
