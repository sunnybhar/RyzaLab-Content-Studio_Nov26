import { applyCommand } from "./engine";
import { currentCopyAcceptance } from "./solo-quality";
import {orchestrateReviewPreparation} from "./review-preparation";
import { z } from "zod";
import type { StudioState, Job } from "./types";
import { studioDatabaseError } from "./database-errors";
import { database, persist, encrypt, decrypt } from "./store";
import { StudioError } from "./permissions";
import { settleWrittenOutput } from "./draft-candidates";
import { settleUsageCost } from "./usage-cost";
import { parseGeneratedIdeas, requestedIdeaQuantity } from "./idea-generation";
export const LEASE_EXPIRED_ERROR =
  "Worker lease expired after dispatch intent. Reservation retained; do not retry.";
const usage = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheCreationTokens: z.number().int().nonnegative(),
});
const receiptSchema = z
  .object({
    version: z.literal(1),
    jobId: z.string().min(1).max(150),
    leaseId: z.string().min(1).max(150),
    receivedAt: z.iso.datetime(),
    outcome: z
      .object({
        text: z.string().max(200000).optional(),
        usage: usage.optional(),
        completion: z.enum(["complete", "incomplete", "refused"]).optional(),
        stopReason: z.string().max(100).optional(),
      })
      .optional(),
    problem: z
      .object({ ambiguous: z.boolean(), message: z.string().max(2000) })
      .optional(),
    storedMedia: z
      .string()
      .regex(/^\/api\/studio\/assets\?id=[0-9a-f-]{36}$/i)
      .optional(),
    mediaReturned: z.boolean().optional(),
  })
  .strict()
  .refine(
    (receipt) => Boolean(receipt.outcome || receipt.problem),
    "Receipt needs an actual provider outcome.",
  );
export type WorkerReceipt = z.infer<typeof receiptSchema>;
function path(jobId: string, leaseId: string) {
  if (
    !/^[a-zA-Z0-9_-]{1,150}$/.test(jobId) ||
    !/^[a-zA-Z0-9_-]{1,150}$/.test(leaseId)
  )
    throw new StudioError(400, "Invalid saved outcome identity.");
  return `worker-outcomes/${jobId}/${leaseId}.enc`;
}
export async function saveWorkerReceipt(
  db: ReturnType<typeof database>,
  receipt: WorkerReceipt,
) {
  const parsed = receiptSchema.parse(receipt),
    body = encrypt(JSON.stringify(parsed));
  const { error } = await db.storage
    .from("studio-assets")
    .upload(path(parsed.jobId, parsed.leaseId), Buffer.from(body), {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (error)
    throw new StudioError(
      503,
      "The provider result backup could not be saved. No provider request was repeated.",
    );
}
export async function readWorkerReceipt(
  db: ReturnType<typeof database>,
  job: Pick<Job, "id" | "leaseId">,
) {
  if (!job.leaseId) return;
  const { data, error } = await db.storage
    .from("studio-assets")
    .download(path(job.id, job.leaseId));
  if (error) {
    const code = String(
      (error as { statusCode?: string; status?: number }).statusCode ||
        (error as { status?: number }).status ||
        "",
    );
    if (["400", "404"].includes(code)) return;
    throw new StudioError(
      503,
      "Saved outcome storage is unavailable. No new AI request was made.",
    );
  }
  if (!data) return;
  if (data.size > 2000000)
    throw new StudioError(
      503,
      "Saved provider outcome is too large to recover automatically.",
    );
  const receipt = receiptSchema.parse(JSON.parse(decrypt(await data.text())));
  if (receipt.jobId !== job.id || receipt.leaseId !== job.leaseId)
    throw new StudioError(
      409,
      "Saved outcome does not match this request lease.",
    );
  return receipt;
}
export function canSettleLease(job: Job, leaseId: string) {
  return (
    job.leaseId === leaseId &&
    (job.state === "running" ||
      (job.state === "unknown" &&
        job.error === LEASE_EXPIRED_ERROR &&
        job.actual === undefined &&
        job.costBasis !== "human_reconciled"))
  );
}
/** Applies an existing receipt. Never dispatches a provider or manufactures missing text. */
export function applyWorkerReceipt(
  previous: StudioState,
  receipt: WorkerReceipt,
): StudioState {
  receipt = receiptSchema.parse(receipt);
  const next = structuredClone(previous),
    j = next.jobs.find((job) => job.id === receipt.jobId);
  if (!j) throw new StudioError(404, "Saved request not found.");
  if (
    j.leaseId === receipt.leaseId &&
    (j.state === "succeeded" || j.settledReceiptLeaseId === receipt.leaseId)
  )
    return previous;
  if (!canSettleLease(j, receipt.leaseId))
    throw new StudioError(
      409,
      "Request outcome or lease changed. Saved evidence will not overwrite a reconciled outcome.",
    );
  const { outcome, problem } = receipt;
  if (problem) {
    j.state = problem.ambiguous ? "unknown" : "failed";
    j.error = problem.message;
    if (!problem.ambiguous) j.reserved = 0;
  } else if (receipt.mediaReturned) {
    j.state = "succeeded";
    j.result =
      receipt.storedMedia ||
      "Media returned without a draft attachment; inspect the saved outcome.";
    j.error =
      "Provider completed; cost remains conservatively reserved pending invoice reconciliation.";
  } else {
    j.state = "succeeded";
    j.result = outcome?.text || "";
    j.providerCompletion = outcome?.completion;
    j.providerStopReason = outcome?.stopReason;
    j.error = undefined;
    if (j.outputContract) {
      if (j.writingFollowupId) {
        j.outputStatus = "conflict";
        j.error =
          "Earlier attempt recovered; its result and cost are saved without replacing the newer writing attempt.";
      } else settleWrittenOutput(next, j, outcome || {}, receipt.receivedAt);
    }
    if (j.kind === "ideas" && outcome?.text) {
      try {
        if (outcome.completion !== "complete")
          throw new Error(
            outcome.completion === "refused"
              ? "The provider refused this idea request. No cards were imported."
              : "Idea generation was incomplete. The raw response is retained; no incomplete batch was imported.",
          );
        const items = parseGeneratedIdeas(
          outcome.text,
          requestedIdeaQuantity(j.prompt),
        );
        if (
          j.ideaPurpose !== "manual_assistance" &&
          !next.ideas.some((idea) => idea.generationRunId === j.id)
        )
          for (const item of items)
            next.ideas.unshift({
              ...item,
              ...(j.researchUnavailable ? { sources: [], researchUnavailable: true } : {}),
              ...(j.researchSourceCount !== undefined ? { researchSourceCount: j.researchSourceCount } : {}),
              id: crypto.randomUUID(),
              channel: j.channel,
              state: "pending",
              origin: "agent",
              generationRunId: j.id,
              researchJobIds: j.researchJobIds,
              createdBy: j.createdBy,
              createdAt: receipt.receivedAt,
            });
      } catch (e) {
        j.error =
          e instanceof Error ? e.message : "Saved idea output needs attention.";
      }
    }
    j.error ||=
      "Provider completed; cost remains conservatively reserved pending invoice reconciliation.";
  }
  if (outcome?.usage) settleUsageCost(j, outcome.usage);
  j.settledReceiptLeaseId = receipt.leaseId;
  next.version++;
  next.audit.push({
    id: crypto.randomUUID(),
    actor: "studio-worker",
    action: `job.${j.state}`,
    target: j.id,
    at: receipt.receivedAt,
  });
  if (j.kind === "image" && j.autoAttachImage && j.state === "succeeded" && receipt.storedMedia) {
    const draft = next.contents.find(content => content.id === j.contentId);
    const member = next.members.find(member => member.email === j.createdBy && !member.revoked);
    if (draft && member && draft.state === "draft" && !draft.deletedAt && draft.revision === j.targetRevision &&
        (draft.mediaRevision ?? 1) === j.mediaRevision && !currentCopyAcceptance(draft, next)) {
      try {
        return applyCommand(next, { email: member.email, id: member.id }, {
          type: "content.image.apply", contentId: draft.id, jobId: j.id, expectedRevision: draft.revision,
          alt: "AI-generated concept illustration", caption: "AI-generated concept illustration.",
        }, { now: receipt.receivedAt });
      } catch (error) {
        if (!(error instanceof StudioError)) throw error;
      }
    }
    j.error = "Image saved. The current draft could not be updated automatically. Open the result to attach it.";
  }
  return next;
}

export async function persistWorkerReceipt(
  db: ReturnType<typeof database>,
  receipt: WorkerReceipt,
  stage: (name: string) => void = () => {},
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    stage("settlement_workspace_read");
    const { data, error } = await db
      .from("studio_workspace")
      .select("state")
      .eq("id", true)
      .single();
    if (error) throw studioDatabaseError(error, "read");
    const previous = data?.state as StudioState | undefined;
    if (!previous)
      throw new StudioError(
        503,
        "Workspace unavailable for saved outcome recovery. No provider request was repeated.",
      );
    const next = orchestrateReviewPreparation(applyWorkerReceipt(previous, receipt),receipt.receivedAt);
    try {
      stage("settlement_persist");
      await persist(db, previous, next);
      return next.jobs.find((job) => job.id === receipt.jobId)!;
    } catch (e) {
      if (e instanceof StudioError && e.code === 409) continue;
      throw e;
    }
  }
  throw new StudioError(
    409,
    "Saved outcome is retained after a workspace conflict. Check the saved result; no provider request was repeated.",
  );
}
