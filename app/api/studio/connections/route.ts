import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState, persist, encrypt } from "@/lib/studio/store";
import {
  requirePermission,
  filteredState,
  StudioError,
} from "@/lib/studio/permissions";
import { FUNCTIONS } from "@/lib/studio/types";
import { failure } from "@/lib/studio/http";
const schema = z
  .object({
    id: z.string().min(1).max(150).optional(),
    expectedUpdatedAt: z.string().min(1).optional(),
    title: z.string().min(1).max(100),
    provider: z.enum(["anthropic", "openai", "google"]),
    function: z.enum(FUNCTIONS),
    model: z.string().regex(/^[A-Za-z0-9_.:/-]{1,150}$/),
    key: z.string().min(10).max(2048).optional(),
    maxRequestCost: z.number().int().min(0).max(10000000).optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor);
    const input = schema.parse(await req.json());
    requirePermission(state, actor, "connections.manage", {
      function: input.function,
    });
    const existing = input.id
      ? state.connections.find((c) => c.id === input.id)
      : undefined;
    if (input.id && !existing)
      throw new StudioError(404, "Connection not found.");
    if (existing) {
      requirePermission(state, actor, "connections.manage", {
        function: existing.function,
      });
      if (existing.updatedAt !== input.expectedUpdatedAt)
        throw new StudioError(
          409,
          "Connection changed. Reopen it before saving.",
        );
      if (
        state.jobs.some(
          (j) =>
            j.connectionId === existing.id &&
            ["queued", "running", "unknown", "awaiting_confirmation"].includes(
              j.state,
            ),
        )
      )
        throw new StudioError(
          409,
          "Resolve active or uncertain requests before editing this connection.",
        );
      if (existing.function !== input.function)
        throw new StudioError(
          400,
          "Keep this connection's function; create a separate connection for another function.",
        );
      if (
        (!existing.hasKey ||
          existing.status === "disconnected" ||
          existing.provider !== input.provider) &&
        !input.key
      )
        throw new StudioError(400, "Enter a new API key for this provider.");
    } else if (!input.key) throw new StudioError(400, "Enter an API key.");
    const id = existing?.id || crypto.randomUUID(),
      next = structuredClone(state);
    const updatedAt = new Date(
      Math.max(Date.now(), existing ? Date.parse(existing.updatedAt) + 1 : 0),
    ).toISOString();
    const record = {
      id,
      title: input.title,
      provider: input.provider,
      function: input.function,
      model: input.model,
      hasKey: true,
      status: "unverified" as const,
      updatedAt,
      maxRequestCost:
        input.maxRequestCost ??
        (existing as typeof existing & { maxRequestCost?: number })
          ?.maxRequestCost ??
        0,
    };
    if (existing)
      Object.assign(
        next.connections.find((c) => c.id === id)!,
        record,
      );
    else next.connections.push(record);
    next.version++;
    next.audit.push({
      id: crypto.randomUUID(),
      actor: actor.email,
      action: existing ? "connection.updated" : "connection.created",
      target: id,
      at: new Date().toISOString(),
    });
    await persist(
      db,
      state,
      next,
      input.key ? { id, ciphertext: encrypt(input.key) } : undefined,
    );
    return NextResponse.json({
      state: filteredState(next, actor),
      actor,
      mode: "live",
    });
  } catch (e) {
    return failure(e);
  }
}
