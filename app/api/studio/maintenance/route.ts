import { orchestrateInitialWriting } from "@/lib/studio/writing-orchestration";
import { orchestrateReviews } from "@/lib/studio/review-orchestration";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { database, persist } from "@/lib/studio/store";
import { StudioError } from "@/lib/studio/permissions";
import { syncOneGoogleDoc } from "@/lib/studio/docs-sync-worker";
import { maintenance } from "@/lib/studio/maintenance";
import type { StudioState } from "@/lib/studio/types";
import { failure } from "@/lib/studio/http";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    const configured = process.env.STUDIO_WORKER_TOKEN,
      provided =
        req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
    if (
      !configured ||
      configured.length < 32 ||
      Buffer.byteLength(configured) !== Buffer.byteLength(provided) ||
      !timingSafeEqual(Buffer.from(configured), Buffer.from(provided))
    )
      throw new StudioError(401, "Worker authorization required.");
    const db = database(),
      { data } = await db
        .from("studio_workspace")
        .select("state")
        .eq("id", true)
        .single();
    if (!data) throw new StudioError(503, "Initialize Studio first.");
    const previous = data.state as StudioState,
      next = orchestrateReviews(orchestrateInitialWriting(maintenance(previous)));
    await persist(db, previous, next);
    const docs = await syncOneGoogleDoc(db, next);
    return NextResponse.json({
      docs,
      changed: next.version !== previous.version,
      email:
        "Delivery requires a selected/configured transactional email adapter.",
    });
  } catch (e) {
    return failure(e);
  }
}
