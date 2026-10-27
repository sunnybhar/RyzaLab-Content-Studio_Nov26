import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState, persist, encrypt } from "@/lib/studio/store";
import { requirePermission, filteredState } from "@/lib/studio/permissions";
import { FUNCTIONS } from "@/lib/studio/types";
import { failure } from "@/lib/studio/http";
const schema = z
  .object({
    title: z.string().min(1).max(100),
    provider: z.enum(["anthropic", "openai", "google"]),
    function: z.enum(FUNCTIONS),
    model: z.string().regex(/^[A-Za-z0-9_.:/-]{1,150}$/),
    key: z.string().min(10).max(2048),
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
    const id = crypto.randomUUID(),
      next = structuredClone(state);
    next.connections.push({
      id,
      title: input.title,
      provider: input.provider,
      function: input.function,
      model: input.model,
      hasKey: true,
      status: "unverified",
      updatedAt: new Date().toISOString(),
      ...{ maxRequestCost: input.maxRequestCost || 0 },
    });
    next.version++;
    next.audit.push({
      id: crypto.randomUUID(),
      actor: actor.email,
      action: "connection.created",
      target: id,
      at: new Date().toISOString(),
    });
    await persist(db, state, next, { id, ciphertext: encrypt(input.key) });
    return NextResponse.json({
      state: filteredState(next, actor),
      actor,
      mode: "live",
    });
  } catch (e) {
    return failure(e);
  }
}
