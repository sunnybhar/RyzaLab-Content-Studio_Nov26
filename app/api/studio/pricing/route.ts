import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState, persist } from "@/lib/studio/store";
import {
  requirePermission,
  filteredState,
  StudioError,
} from "@/lib/studio/permissions";
import { effectiveRates } from "@/lib/studio/pricing";
import { updateRates } from "@/lib/studio/rate-management";
import { failure } from "@/lib/studio/http";
export async function GET(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    requirePermission(state, actor, "settings.manage");
    return NextResponse.json(
      {
        rates: effectiveRates(state),
        version: state.settings.pricingRegistryVersion || 0,
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
    requirePermission(state, actor, "settings.manage");
    if (Number(req.headers.get("content-length") || 0) > 20000)
      throw new StudioError(413, "Pricing request too large.");
    const next = updateRates(
      state,
      actor,
      await req.json(),
      effectiveRates(state),
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
