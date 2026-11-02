import { orchestrateInitialWriting } from "@/lib/studio/writing-orchestration";
import { orchestrateReviews } from "@/lib/studio/review-orchestration";
import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  loadState,
  persist,
  hash,
  encrypt,
} from "@/lib/studio/store";
import { retrievePublicReferences } from "@/lib/studio/public-retrieval";
import { publicRetrievalTarget, researchJobInput } from "@/lib/studio/research-link";
import { generationInput } from "@/lib/studio/generation";
import { ideaJobInput } from "@/lib/studio/idea-generation";
import { loadChannelPreset } from "@/lib/studio/preset-store";
import { quote } from "@/lib/studio/pricing";
import { commandSchema } from "@/lib/studio/commands";
import { applyCommand } from "@/lib/studio/engine";
import {
  filteredState,
  StudioError,
  requirePermission,
} from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";

import { verifyApprovalAssets } from "@/lib/studio/assets";

export const maxDuration = 60;

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
    const state = await loadState(db, actor);
    const parsed = commandSchema.parse(await req.json());
    const command = commandSchema.parse(
      parsed.type === "content.generate"
        ? generationInput(state, actor, parsed)
        : parsed.type === "research.start" ? researchJobInput(state,actor,parsed) : parsed,
    );
    if (command.type === "idea.generate") {
      requirePermission(state, actor, "idea.edit", {
        channel: command.channel,
      });
      requirePermission(state, actor, "job.create", {
        channel: command.channel,
        function: "ideas",
      });
    }
    if (command.type === "workflow.importPreset")
      requirePermission(state, actor, "workflow.edit", {
        channel: command.channel,
      });
    let assetManifest: unknown[] = [];
    if (command.type === "package.approve") {
      const content = state.contents.find((d) => d.id === command.contentId);
      if (content) {
        requirePermission(state, actor, "package.approve", {
          channel: content.channel,
          account: content.account,
          contentId: content.id,
          assignedTo: content.assignedTo,
        });
        assetManifest = await verifyApprovalAssets(
          content,
          async (id) => {
            const { data } = await db
              .from("studio_assets")
              .select("content_id,object_path,mime")
              .eq("id", id)
              .maybeSingle();
            return data;
          },
          async (path) => {
            const { data, error } = await db.storage
              .from("studio-assets")
              .info(path);
            return error ? null : data;
          },
        );
      }
    }
    const priced =
      command.type === "job.enqueue"
        ? quote(state, command)
        : command.type === "idea.generate"
          ? quote(state, ideaJobInput(state, actor, command))
          : undefined;
    let retrievalResult: unknown;
    if(command.type==="research.retrieve") {
      const {existing}=publicRetrievalTarget(state,actor,command);
      if(existing)return NextResponse.json({state:filteredState(state,actor),actor,mode:"live"});
      retrievalResult=await retrievePublicReferences(command.query);
    }
    let next = applyCommand(state, actor, command, {
      hash,
      retrievalResult,
      canonicalGeneration: parsed.type === "content.generate" || parsed.type === "research.start",
      quotedCost: priced?.cost,
      pricingSnapshot: priced?.pricingSnapshot,
      assetManifest,
      preset:
        command.type === "workflow.importPreset"
          ? await loadChannelPreset(command.channel)
          : undefined,
    });
    if (command.type === "idea.use") next = orchestrateInitialWriting(next);
    if (command.type === "content.acceptCopy") next = orchestrateReviews(next);
    if (Buffer.byteLength(JSON.stringify(next)) > 24000000)
      throw new StudioError(
        413,
        "Workspace history reached its current storage limit. Archive design is required before growing further.",
      );
    // Atomically erase the credential alongside disconnect/delete, with a nonsecret
    // encrypted-empty tombstone accepted by the existing deployed commit function.
    const secret =
      command.type === "connection.disconnect" ||
      command.type === "connection.delete"
        ? { id: command.id, ciphertext: encrypt("") }
        : undefined;
    await persist(db, state, next, secret);
    return NextResponse.json({
      state: filteredState(next, actor),
      actor,
      mode: "live",
    });
  } catch (e) {
    return failure(e);
  }
}
