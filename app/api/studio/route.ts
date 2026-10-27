import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState, persist, hash } from "@/lib/studio/store";
import { quote } from "@/lib/studio/pricing";
import { commandSchema } from "@/lib/studio/commands";
import { applyCommand } from "@/lib/studio/engine";
import { filteredState, StudioError } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";

export async function GET(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    return NextResponse.json(
      { state: filteredState(state, actor), actor, mode: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    if (Number(req.headers.get("content-length") || 0) > 12000000)
      throw new StudioError(
        413,
        "Command is too large; upload assets separately.",
      );
    const state = await loadState(db, actor),
      command = commandSchema.parse(await req.json());
    if (command.type === "package.approve") {
      const d = state.contents.find((x) => x.id === command.contentId);
      if (d) {
        const urls = [
          d.media.imageUrl,
          ...d.media.slides.map((x) => x.image),
          ...d.media.scenes.flatMap((x) => [x.sourceUrl, x.audioUrl]),
        ].filter(Boolean) as string[];
        for (const url of urls) {
          const id = /^\/api\/studio\/assets\?id=([0-9a-f-]{36})$/i.exec(
            url,
          )?.[1];
          if (!id)
            throw new StudioError(
              400,
              "Upload immutable media before approval.",
            );
          const { data: asset } = await db
            .from("studio_assets")
            .select("content_id,object_path")
            .eq("id", id)
            .maybeSingle();
          if (!asset || asset.content_id !== d.id)
            throw new StudioError(
              403,
              "An approved asset must belong to this exact content item.",
            );
        }
      }
    }
    const priced =
      command.type === "job.enqueue" ? quote(state, command) : undefined;
    const next = applyCommand(state, actor, command, {
      hash,
      quotedCost: priced?.cost,
      pricingSnapshot: priced?.pricingSnapshot,
    });
    if (Buffer.byteLength(JSON.stringify(next)) > 24000000)
      throw new StudioError(
        413,
        "Workspace history reached its current storage limit. Archive design is required before growing further.",
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
