import {studioDatabaseError} from "@/lib/studio/database-errors";
import {studioRequestDiagnostics} from "@/lib/studio/request-diagnostics";
import {settleUsageCost,type ClaudeUsage} from "@/lib/studio/usage-cost";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { database, loadState, persist, decrypt } from "@/lib/studio/store";
import { StudioError } from "@/lib/studio/permissions";
import { canDispatchJob } from "@/lib/studio/dispatch-permissions";
import { budgetMonth } from "@/lib/studio/time";
import {
  parseGeneratedIdeas,
  requestedIdeaQuantity,
} from "@/lib/studio/idea-generation";
import { effectiveRates, pricingSnapshotIsCurrent } from "@/lib/studio/pricing";
import { runProvider, ProviderFailure } from "@/lib/studio/providers";
import { settleWrittenOutput } from "@/lib/studio/draft-candidates";
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
    const db = database(),
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
    if (expired) {
      diagnostics.stage("mark_expired_request");
      const next = structuredClone(state),
        j = next.jobs.find((j) => j.id === expired.id)!;
      j.state = "unknown";
      j.error =
        "Worker lease expired after dispatch intent. Reservation retained; do not retry.";
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
    await loadState(db, actor);
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
        decrypt(secret.ciphertext),
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
    // Do not repeat the provider call if a concurrent human edit changes the workspace version.
    for (let attempt = 0; attempt < 4; attempt++) {
      diagnostics.stage("settlement_workspace_read");
      const fresh = await db
          .from("studio_workspace")
          .select("state")
          .eq("id", true)
          .single(),
        previous = fresh.data?.state as typeof state;
      if(fresh.error)throw studioDatabaseError(fresh.error,"read");
      if (!previous)
        throw new StudioError(
          503,
          "Workspace unavailable after provider request. Reconcile the running job.",
        );
      const next = structuredClone(previous),
        j = next.jobs.find((j) => j.id === job.id);
      if (!j || j.leaseId !== lease || j.state !== "running")
        throw new StudioError(
          409,
          "Job lease changed; provider outcome must be reconciled, not retried.",
        );
      if (problem) {
        j.state = problem.ambiguous ? "unknown" : "failed";
        j.error = problem.message;
        if (!problem.ambiguous) j.reserved = 0;
      } else if (outcome?.bytes) {
        j.state = "succeeded";
        j.result =
          storedMedia ||
          "Media returned without a draft attachment; reconcile the stored provider result.";
        j.error ||=
          "Provider completed; cost remains conservatively reserved pending invoice reconciliation.";
      } else {
        j.state = "succeeded";
        j.result = outcome?.text || "";
        j.providerCompletion=outcome?.completion;j.providerStopReason=outcome?.stopReason;
        if (j.outputContract)
          settleWrittenOutput(next, j, outcome || {}, new Date().toISOString());
        if (j.kind === "ideas" && outcome?.text) {
          try {
            if (outcome.completion !== "complete")
              throw new Error(
                outcome.completion==="refused"?"The provider refused this idea request. The saved response is available; no cards were imported.":outcome.stopReason==="max_tokens"||/^\[INCOMPLETE OUTPUT/i.test(outcome.text)?"Idea generation was incomplete: the provider reached its output token limit. Recover complete saved cards below where available; no automatic paid retry was made.":"Idea generation was incomplete. The raw response is retained; no incomplete batch was imported.",
              );
            const items = parseGeneratedIdeas(
              outcome.text,
              requestedIdeaQuantity(j.prompt),
            );
            for (const item of j.ideaPurpose==="manual_assistance"?[]:items)
              next.ideas.unshift({
                ...item,
                id: crypto.randomUUID(),
                channel: j.channel,
                state: "pending",
                origin: "agent",
                generationRunId: j.id,
                researchJobIds: j.researchJobIds,
                createdBy: j.createdBy,
                createdAt: new Date().toISOString(),
              });
          } catch (error) {
            j.error =
              error instanceof Error
                ? error.message
                : "The provider response did not match the idea-card format. The raw result is retained; no partial cards were imported.";
          }
        }

        j.error ||=
          "Provider completed; cost remains conservatively reserved pending invoice reconciliation.";
      }
      if(outcome?.usage)settleUsageCost(j,outcome.usage);
      next.version++;
      next.audit.push({
        id: crypto.randomUUID(),
        actor: "studio-worker",
        action: `job.${j.state}`,
        target: j.id,
        at: new Date().toISOString(),
      });
      try {
        diagnostics.stage("settlement_persist");
        await persist(db, previous, next);
        diagnostics.stage("complete");
        return NextResponse.json({ jobId: j.id, state: j.state });
      } catch (e) {
        if (e instanceof StudioError && e.code === 409) continue;
        throw e;
      }
    }
    throw new StudioError(
      409,
      "Provider finished but settlement conflicted. Reservation retained in running job; reconcile without generating again.",
    );
  } catch (e) {
    diagnostics.failed(e);
    return failure(e,diagnostics.trace);
  }
}
