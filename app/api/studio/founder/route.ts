import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState, persist } from "@/lib/studio/store";
import { claimFounder, founderSetupStatus } from "@/lib/studio/founder-setup";
import { filteredState, StudioError } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";
export async function GET(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    return NextResponse.json(
      {
        ...founderSetupStatus(state, actor, process.env.STUDIO_FOUNDER_EMAIL),
        version: state.version,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    if (Number(req.headers.get("content-length") || 0) > 4096)
      throw new StudioError(413, "Founder setup request too large.");
    const next = claimFounder(
      state,
      actor,
      await req.json(),
      process.env.STUDIO_FOUNDER_EMAIL,
      new Date().toISOString(),
      crypto.randomUUID(),
    );
    await persist(db, state, next);
    return NextResponse.json(
      { state: filteredState(next, actor), actor, mode: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
