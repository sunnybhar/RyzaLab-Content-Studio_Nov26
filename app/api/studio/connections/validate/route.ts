import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState, persist, decrypt } from "@/lib/studio/store";
import {
  requirePermission,
  filteredState,
  StudioError,
} from "@/lib/studio/permissions";
import { validateConnection } from "@/lib/studio/providers";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor);
    const { id } = await req.json(),
      connection = state.connections.find((c) => c.id === id);
    if (!connection) throw new StudioError(404, "Connection not found.");
    requirePermission(state, actor, "connections.manage", {
      function: connection.function,
    });
    if (connection.status === "disconnected" || !connection.hasKey)
      throw new StudioError(
        400,
        "This connection is disconnected. Add a replacement credential.",
      );
    const { data } = await db
      .from("studio_secrets")
      .select("ciphertext")
      .eq("id", id)
      .single();
    if (!data) throw new StudioError(503, "Credential is unavailable.");
    await validateConnection(connection, decrypt(data.ciphertext));
    const next = structuredClone(state);
    Object.assign(
      next.connections.find((c) => c.id === id)!,
      { status: "validated", updatedAt: new Date().toISOString() },
    );
    next.version++;
    next.audit.push({
      id: crypto.randomUUID(),
      actor: actor.email,
      action: "connection.model_access_validated",
      target: id,
      at: new Date().toISOString(),
    });
    await persist(db, state, next);
    return NextResponse.json({
      state: filteredState(next, actor),
      actor,
      mode: "live",
      message:
        "Model access validated. Output quality and conservative pricing allowance still require evaluation.",
    });
  } catch (e) {
    return failure(e);
  }
}
