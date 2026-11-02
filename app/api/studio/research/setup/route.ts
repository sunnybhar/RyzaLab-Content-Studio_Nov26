import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { authenticate,loadState,decrypt,persist } from "@/lib/studio/store";
import { filteredState,requirePermission,StudioError } from "@/lib/studio/permissions";
import { inspectClaudeResearchModel } from "@/lib/studio/model-discovery";
import { researchSetupPlan,saveResearchSetup } from "@/lib/studio/research-setup";
import { failure } from "@/lib/studio/http";
const schema=z.object({action:z.enum(["check","save"]),connectionId:z.string().min(1).max(150),outputTokens:z.number().int().min(128).max(1024),packageCap:z.number().int().min(50).max(200),expectedUpdatedAt:z.string().min(1),expectedVersion:z.number().int().nonnegative(),expectedPricingVersion:z.number().int().nonnegative()}).strict();
export async function POST(req:NextRequest) {
 try {
  if(Number(req.headers.get("content-length")||0)>5000)throw new StudioError(413,"Setup request is too large.");
  const {db,actor}=await authenticate(req),state=await loadState(db,actor),input=schema.parse(await req.json());
  requirePermission(state,actor,"settings.manage");requirePermission(state,actor,"connections.manage",{function:"research"});
  const connection=state.connections.find(c=>c.id===input.connectionId);
  if(!connection||connection.provider!=="anthropic"||connection.function!=="research"||connection.status==="disconnected"||!connection.hasKey||connection.updatedAt!==input.expectedUpdatedAt||state.version!==input.expectedVersion)throw new StudioError(409,"Select a current Claude Research connection. Refresh if it changed.");
  const {data}=await db.from("studio_secrets").select("ciphertext").eq("id",connection.id).single();if(!data)throw new StudioError(503,"Stored research credential is unavailable.");
  const capability=await inspectClaudeResearchModel(connection.model,decrypt(data.ciphertext));
  const plan=researchSetupPlan(state,connection,capability,input.outputTokens,input.packageCap);
  if(input.action==="check")return NextResponse.json({plan,capability},{headers:{"Cache-Control":"no-store"}});
  const next=saveResearchSetup(state,actor,input,capability,new Date().toISOString(),crypto.randomUUID());
  await persist(db,state,next);
  return NextResponse.json({state:filteredState(next,actor),actor,mode:"live",plan,capability},{headers:{"Cache-Control":"no-store"}});
 } catch(error){return failure(error);}
}
