import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState } from "@/lib/studio/store";
import { StudioError, requirePermission } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor),
      form = await req.formData(),
      file = form.get("file"),
      contentId = String(form.get("contentId") || ""),
      d = state.contents.find((x) => x.id === contentId);
    if (!d || !(file instanceof File))
      throw new StudioError(400, "Select a draft and a file.");
    requirePermission(state, actor, "content.edit", {
      channel: d.channel,
      account: d.account,
      contentId: d.id,
      assignedTo: d.assignedTo,
    });
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "video/mp4",
        "audio/mpeg",
        "audio/wav",
      ].includes(file.type) ||
      file.size > 50 * 1024 * 1024
    )
      throw new StudioError(
        400,
        "Use PNG, JPEG, WebP, MP4, MP3 or WAV up to 50 MB.",
      );
    const id = crypto.randomUUID(),
      path = `${d.id}/${id}`;
    const { error } = await db.storage
      .from("studio-assets")
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });
    if (error)
      throw new StudioError(
        503,
        "Private media storage is not configured or upload failed.",
      );
    const { error: recordError } = await db
      .from("studio_assets")
      .insert({
        id,
        content_id: d.id,
        object_path: path,
        uploaded_by: actor.id,
        mime: file.type,
        name: file.name.slice(0, 200),
      });
    if (recordError) {
      await db.storage.from("studio-assets").remove([path]);
      throw new StudioError(503, "Asset record could not be saved.");
    }
    return NextResponse.json({
      id,
      url: `/api/studio/assets?id=${id}`,
      name: file.name,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function GET(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor),
      id = req.nextUrl.searchParams.get("id"),
      { data: asset } = await db
        .from("studio_assets")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (!asset) throw new StudioError(404, "Asset not found.");
    const d = state.contents.find((x) => x.id === asset.content_id);
    if (!d) throw new StudioError(404, "Content not found.");
    requirePermission(state, actor, "read", {
      channel: d.channel,
      account: d.account,
      contentId: d.id,
      assignedTo: d.assignedTo,
    });
    const { data, error } = await db.storage
      .from("studio-assets")
      .download(asset.object_path);
    if (error || !data) throw new StudioError(404, "Asset unavailable.");
    return new NextResponse(data, {
      headers: {
        "Content-Type": asset.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
