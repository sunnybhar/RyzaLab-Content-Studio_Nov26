import {saveWorkerReceipt,readWorkerReceipt,applyWorkerReceipt,LEASE_EXPIRED_ERROR,type WorkerReceipt} from "@/lib/studio/worker-receipt";
import {studioDatabaseError} from "@/lib/studio/database-errors";
import {studioRequestDiagnostics} from "@/lib/studio/request-diagnostics";
import {type ClaudeUsage} from "@/lib/studio/usage-cost";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { database, loadState, persist, decrypt } from "@/lib/studio/store";
import { StudioError } from "@/lib/studio/permissions";
import { canDispatchJob } from "@/lib/studio/dispatch-permissions";
import { budgetMonth } from "@/lib/studio/time";

import { effectiveRates, pricingSnapshotIsCurrent } from "@/lib/studio/pricing";
import { runProvider, ProviderFailure } from "@/lib/studio/providers";
import {
  jobPreparation,
  preparationSpend,
} from "@/lib/studio/preparation-budget";
import { failure } from "@/lib/studio/http";
export const maxDuration = 180;
export async function POST(req: NextRequest) {
  const diagnostics=studioRequestDiagnostics("POST /api/studio/worker");
  try {
    diagnostics.stage("authenticate_worker");
    const configured = process.env.STUDIO_WORKER_TOKEN,
      provided =
        req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
    if (
      !configured ||
      configured.length < 32 ||
      Buffer.byteLength(provided) !== Buffer.byteLength(configured) ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(configured))
    )
      throw new StudioError(401, "Worker authorization required.");
    if (process.env.STUDIO_ALLOW_PROVIDER_EXECUTION !== "true")
      throw new StudioError(
        503,
        "Provider execution is disabled pending provider, pricing, and spending authorization.",
      );
    diagnostics.stage("workspace_read");
    const db = database(12000),
      { data,error:readError } = await db
        .from("studio_workspace")
        .select("state")
        .eq("id", true)
        .single();
    if(readError)throw studioDatabaseError(readError,"read");
    if (!data) throw new StudioError(503, "Initialize Studio first.");
    const requestedJobId=req.nextUrl.searchParams.get("jobId");
    const state = data.state as Awaited<ReturnType<typeof loadState>>,
      now = new Date().toISOString(),
      expired = state.jobs.find(
        (j) => j.state === "running" && j.leaseUntil && j.leaseUntil < now && (!requestedJobId || j.id===requestedJobId),
      );
    const recoverable=state.jobs.find(j=>(!requestedJobId||j.id===requestedJobId)&&j.leaseId&&["running","unknown"].includes(j.state));
    if(recoverable){
      diagnostics.stage("saved_outcome_read");
      const receipt=await readWorkerReceipt(db,recoverable);
      if(receipt){
        for(let attempt=0;attempt<4;attempt++){
          const {data:fresh,error}=await db.from("studio_workspace").select("state").eq("id",true).single();
          if(error)throw studioDatabaseError(error,"read");
          const previous=fresh?.state as typeof state;if(!previous)throw new StudioError(503,"Workspace unavailable for saved outcome recovery.");
          const next=applyWorkerReceipt(previous,receipt);
          try{await persist(db,previous,next);return NextResponse.json({jobId:recoverable.id,state:next.jobs.find(j=>j.id===recoverable.id)!.state,recovered:true});}catch(e){if(e instanceof StudioError&&e.code===409)continue;throw e;}
        }
        throw new StudioError(409,"Saved outcome is retained. Refresh to recover it; no provider request was repeated.");
      }
      if(recoverable.state==="unknown")return NextResponse.json({jobId:recoverable.id,state:"unknown",recovered:false,message:"No saved provider outcome is available. Original reservation remains retained."});
    }
    if (expired) {
      diagnostics.stage("mark_expired_request");
      const next = structuredClone(state),
        j = next.jobs.find((j) => j.id === expired.id)!;
      j.state = "unknown";
      j.error = LEASE_EXPIRED_ERROR;
      j.leaseExpiredAt=now;
      next.version++;
      await persist(db, state, next);
      return NextResponse.json({ jobId: j.id, state: "unknown" });
    }
    const job = state.jobs.find((j) => j.state === "queued" && (!requestedJobId || j.id===requestedJobId));
    if (!job) return NextResponse.json({ message: "No queued jobs." });
    async function blockJob(reason: string) {
      diagnostics.stage("block_undispatched_request");
      const next = structuredClone(state),
        j = next.jobs.find((j) => j.id === job!.id)!;
      j.state = "blocked";
      j.error = reason;
      next.version++;
      next.notices.push({
        id: crypto.randomUUID(),
        user: job!.createdBy,
        title: "Generation job needs attention",
        body: reason,
        read: false,
        createdAt: now,
        emailState: "not_configured",
        eventId: `job-blocked:${job!.id}`,
      });
      await persist(db, state, next);
      return NextResponse.json({
        jobId: job!.id,
        state: "blocked",
        message: reason,
      });
    }
    const member = state.members.find(
      (m) => m.email === job.createdBy && !m.revoked,
    );
    if (!member)
      return blockJob("Job owner is revoked. No provider request was sent.");
    const actor = { id: member.id, email: member.email };
    if (!canDispatchJob(state, actor, job))
      return blockJob(
        "Content access or job authority changed. Cancel and reauthorize this request.",
      );
    if (job.period !== budgetMonth(now, state.settings.timezone))
      return blockJob(
        "This reservation belongs to an earlier month. Cancel and reauthorize it under the current month.",
      );
    const snapshot = (
      job as typeof job & {
        pricingSnapshot?: {
          model: string;
          provider: string;
          function: string;
          verifiedAt: string;
        };
      }
    ).pricingSnapshot;
    if (!pricingSnapshotIsCurrent(snapshot, effectiveRates(state)))
      return blockJob(
        "The qualified pricing snapshot is missing or changed. Reauthorize this request.",
      );
    if (
      state.settings.reviewPolicy?.mode === "two_step" &&
      job.contentId &&
      !job.preparationId
    )
      return blockJob(
        "This content operation needs a current total package authorization before dispatch.",
      );
    if(job.contentId && state.jobs.filter(existing=>existing.contentId===job.contentId&&existing.id!==job.id).reduce((sum,existing)=>sum+(existing.actual??existing.reserved),0)+job.estimate>200)return blockJob("The total per-post ceiling is $2.00, including previous revisions and uncertain reservations.");
    if (job.preparationId) {
      const authorization = jobPreparation(state, job, now);
      if (
        !authorization ||
        preparationSpend(state, job.preparationId, job.id) + job.estimate >
          Math.min(authorization.maxCents,200)
      )
        return blockJob(
          "Package authorization changed or its total budget is exhausted. Reauthorize without retrying uncertain work.",
        );
    }
    const connection = state.connections.find((c) => c.id === job.connectionId);
    if (!connection || !connection.hasKey || connection.status !== "validated")
      return blockJob("Validate the selected provider/model before execution.");
    if (
      job.connectionSnapshot &&
      (connection.provider !== job.connectionSnapshot.provider ||
        connection.model !== job.connectionSnapshot.model ||
        connection.function !== job.connectionSnapshot.function)
    )
      return blockJob(
        "Provider/model changed after reservation. Reauthorize before execution.",
      );
    diagnostics.stage("credential_read");
    const { data: secret,error:secretError } = await db
      .from("studio_secrets")
      .select("ciphertext")
      .eq("id", connection.id)
      .single();
    if(secretError)throw studioDatabaseError(secretError,"read");
    if (!secret) throw new StudioError(503, "Credential unavailable.");
    const credential=decrypt(secret.ciphertext);
    const claimed = structuredClone(state),
      running = claimed.jobs.find((j) => j.id === job.id)!,
      lease = crypto.randomUUID();
    Object.assign(running, {
      state: "running",
      attempt: running.attempt + 1,
      leaseId: lease,
      leaseUntil: new Date(Date.now() + 180000).toISOString(),
      dispatchStartedAt: now,
    });
    claimed.version++;
    diagnostics.stage("claim_persist");
    await persist(db, state, claimed);
    let outcome:
        | {
            usage?: ClaudeUsage;
            text?: string;
            bytes?: Uint8Array;
            mime?: string;
            completion?: "complete" | "incomplete" | "refused";
      stopReason?:string;
          }
        | undefined,
      problem: ProviderFailure | undefined;
    try {
      diagnostics.stage("provider_call");
      outcome = await runProvider(
        running,
        connection,
        credential,
      );
      diagnostics.stage("provider_outcome_received");
    } catch (e) {
      diagnostics.stage("provider_outcome_error");
      problem =
        e instanceof ProviderFailure
          ? e
          : new ProviderFailure(
              true,
              "Provider outcome requires reconciliation.",
            );
    }
    let storedMedia: string | undefined;
    if (outcome?.bytes && job.contentId) {
      const assetId = crypto.randomUUID(),
        object = `${job.contentId}/${assetId}`;
      const { error: uploadError } = await db.storage
        .from("studio-assets")
        .upload(object, Buffer.from(outcome.bytes), {
          contentType: outcome.mime,
          upsert: false,
        });
      if (!uploadError) {
        const { error: assetError } = await db.from("studio_assets").insert({
          id: assetId,
          content_id: job.contentId,
          object_path: object,
          uploaded_by:
            (job as typeof job & { createdById?: string }).createdById ||
            actor.id,
          mime: outcome.mime,
          name: `generated-${job.id}`,
        });
        if (!assetError) storedMedia = `/api/studio/assets?id=${assetId}`;
      }
      if (!storedMedia)
        problem = new ProviderFailure(
          true,
          "Provider returned media but durable asset settlement failed. Reservation retained; do not generate again.",
        );
    }
    const receipt:WorkerReceipt={version:1,jobId:job.id,leaseId:lease,receivedAt:new Date().toISOString(),
      ...(outcome?{outcome:{text:outcome.text,usage:outcome.usage,completion:outcome.completion,stopReason:outcome.stopReason}}:{}),
      ...(problem?{problem:{ambiguous:problem.ambiguous,message:problem.message}}:{}),
      ...(outcome?.bytes?{mediaReturned:true}:{}),...(storedMedia?{storedMedia}:{})};
    // Keep provider evidence independently of the large workspace CAS.
    diagnostics.stage("saved_outcome_write");
    try{await saveWorkerReceipt(db,receipt);}catch(e){diagnostics.stage("saved_outcome_backup_unavailable");}
    for(let attempt=0;attempt<4;attempt++){
      diagnostics.stage("settlement_workspace_read");
      const {data:fresh,error}=await db.from("studio_workspace").select("state").eq("id",true).single();
      if(error)throw studioDatabaseError(error,"read");
      const previous=fresh?.state as typeof state;
      if(!previous)throw new StudioError(503,"Workspace unavailable after provider request. Check the saved outcome; do not repeat generation.");
      const next=applyWorkerReceipt(previous,receipt);
      try{diagnostics.stage("settlement_persist");await persist(db,previous,next);diagnostics.stage("complete");return NextResponse.json({jobId:job.id,state:next.jobs.find(j=>j.id===job.id)!.state});}
      catch(e){if(e instanceof StudioError&&e.code===409)continue;throw e;}
    }
    throw new StudioError(409,"Provider outcome retained for recovery after a workspace conflict. No provider call was repeated.");
  } catch (e) {
    diagnostics.failed(e);
    return failure(e,diagnostics.trace);
  }
}
