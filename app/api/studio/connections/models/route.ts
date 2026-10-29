import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState, decrypt } from "@/lib/studio/store";
import { requirePermission, StudioError } from "@/lib/studio/permissions";
import { discoverModels } from "@/lib/studio/model-discovery";
import { failure } from "@/lib/studio/http";
import { FUNCTIONS } from "@/lib/studio/types";
const schema = z
  .object({
    provider: z.enum(["anthropic", "openai", "google"]),
    function: z.enum(FUNCTIONS),
    key: z.string().min(10).max(2048).optional(),
    connectionId: z.string().min(1).max(150).optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    if (Number(req.headers.get("content-length") || 0) > 8192)
      throw new StudioError(413, "Request too large.");
    const input = schema.parse(await req.json());
    const state = await loadState(db, actor);
    requirePermission(state, actor, "connections.manage", {
      function: input.function,
    });
    let key = input.key;
    if (!key && input.connectionId) {
      const connection = state.connections.find(
        (c) => c.id === input.connectionId,
      );
      if (
        !connection ||
        connection.provider !== input.provider ||
        connection.function !== input.function ||
        !connection.hasKey ||
        connection.status === "disconnected"
      )
        throw new StudioError(
          400,
          "Select an available connection for this provider and function.",
        );
      const { data } = await db
        .from("studio_secrets")
        .select("ciphertext")
        .eq("id", connection.id)
        .single();
      if (!data) throw new StudioError(503, "Credential is unavailable.");
      key = decrypt(data.ciphertext);
    }
    if (!key)
      throw new StudioError(
        400,
        "Enter a provider key or select a stored connection.",
      );
    const models = await discoverModels(input.provider, key);
    return NextResponse.json(
      { models, qualification: "account_access_only" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
