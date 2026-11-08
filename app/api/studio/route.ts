import {researchProfile} from "@/lib/studio/research-profile";
import {commitDraftSave} from "@/lib/studio/draft-save";
import {assertActiveRequest} from "@/lib/studio/active-channels";
import {studioRequestDiagnostics} from "@/lib/studio/request-diagnostics";
import {readAgentPackage} from "@/lib/studio/agent-package";
import {extractAgentFile,hydrateAgentFiles} from "@/lib/studio/agent-file-extract";
import {automaticIdeaResearch} from "@/lib/studio/automatic-idea-research";
import { orchestrateInitialWriting } from "@/lib/studio/writing-orchestration";
import { orchestrateReviewPreparation } from "@/lib/studio/review-preparation";
import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  loadState,
  persist,
  hash,
  encrypt,
} from "@/lib/studio/store";
import { retrieveBroadReferences } from "@/lib/studio/web-discovery";
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

export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const diagnostics=studioRequestDiagnostics("GET");
  try {
    diagnostics.stage("authenticate");
    const { db, actor } = await authenticate(req);
    diagnostics.stage("load_state");
    const state = await loadState(db, actor);
    diagnostics.stage("respond");
    return NextResponse.json(
      { state: filteredState(state, actor), actor, mode: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    diagnostics.failed(e);
    return failure(e,diagnostics.trace);
  }
}
export async function POST(req: NextRequest) {
  const diagnostics=studioRequestDiagnostics("POST");
  try {
    diagnostics.stage("authenticate");
    const { db, actor } = await authenticate(req);
    if (Number(req.headers.get("content-length") || 0) > 12000000)
      throw new StudioError(
        413,
        "Command is too large; upload assets separately.",
      );
    diagnostics.stage("load_state");
    let original = await loadState(db, actor);
    diagnostics.stage("prepare_command");
    let state=original;
    let parsed = commandSchema.parse(await req.json());
    assertActiveRequest(state,parsed);
    if(parsed.type==="newsletter.compose") {
      requirePermission(state,actor,"content.create",{channel:"Newsletter",account:"RyzaLab"});
      if(parsed.sources.reduce((sum,source)=>sum+(source.kind==="document"?source.file.byteSize:0),0)>524288)throw new StudioError(400,"Combined document uploads must be at most 512 KB.");
      const sources=[];
      for(const source of parsed.sources) sources.push(source.kind==="document"?{...source,extractedText:await extractAgentFile(source.file)}:source);
      parsed={...parsed,sources};
    }
    if(parsed.type==="content.save"&&parsed.operationId){
      diagnostics.stage("save_draft");
      const next=await commitDraftSave(original,actor,parsed,{load:()=>loadState(db,actor),commit:async(before,after)=>{if(Buffer.byteLength(JSON.stringify(after))>24000000)throw new StudioError(413,"Workspace history reached its current storage limit.");await persist(db,before,after);}},{hash});
      diagnostics.stage("respond");
      return NextResponse.json({state:filteredState(next,actor),actor,mode:"live"},{headers:{"Cache-Control":"no-store"}});
    }
    if(parsed.type==="agentRules.importPackage"&&parsed.archives?.length){requirePermission(state,actor,"workflow.edit",{channel:parsed.channel});for(const archive of parsed.archives){const bytes=Buffer.from(archive.base64,"base64");await readAgentPackage(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),archive.kind);}}
    if(parsed.type==="agentRules.save"||parsed.type==="agentVoice.create"){
      requirePermission(state,actor,"workflow.edit",{channel:parsed.channel==="Shared"?undefined:parsed.channel});
      if(parsed.type==="agentRules.save")parsed={...parsed,extractedText:await extractAgentFile(parsed)};
      else parsed={...parsed,extractedText:parsed.file?await extractAgentFile(parsed.file):undefined};
    }

    const contextChannel=parsed.type==="idea.generate"?parsed.channel:parsed.type==="content.generate"?state.contents.find(c=>c.id===parsed.contentId)?.channel:parsed.type==="idea.use"?state.ideas.find(i=>i.id===parsed.id)?.channel:["content.submit","content.reviewEdit"].includes(parsed.type)?state.contents.find(c=>c.id===(parsed as {id:string}).id)?.channel:undefined;
    if(contextChannel){if(!["content.submit","content.reviewEdit"].includes(parsed.type))requirePermission(state,actor,"job.create",{channel:contextChannel,function:parsed.type==="idea.generate"?"ideas":"text"});state=await hydrateAgentFiles(state,contextChannel);}
    let command = commandSchema.parse(
      parsed.type === "content.generate"
        ? generationInput(state, actor, parsed)
        : parsed.type === "research.start" ? researchJobInput(state,actor,parsed) : parsed,
    );
    if(command.type==="idea.generate"&&command.automaticResearch) {
      diagnostics.stage("research_and_prepare_ideas");
      const prepared=await automaticIdeaResearch(state,actor,command,undefined,undefined,async saved=>{await persist(db,original,saved);original=saved;});
      if(prepared.existing)return NextResponse.json({state:filteredState(state,actor),actor,mode:"live"});
      state=prepared.state;command=prepared.command;
    }
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
    diagnostics.stage("price_and_validate");
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
      retrievalResult=await retrieveBroadReferences(command.query,fetch,new Date().toISOString(),researchProfile(state,command.channel),command.sourceUrls);
    }
    diagnostics.stage("apply_command");
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
    if (["content.acceptCopy", "content.submit", "content.reviewEdit", "content.saveSubmit"].includes(command.type)) next = orchestrateReviewPreparation(next);
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
    diagnostics.stage("persist");
    await persist(db, original, next, secret);
    diagnostics.stage("respond");
    return NextResponse.json({
      state: filteredState(next, actor),
      actor,
      mode: "live",
    });
  } catch (e) {
    diagnostics.failed(e);
    return failure(e,diagnostics.trace);
  }
}
