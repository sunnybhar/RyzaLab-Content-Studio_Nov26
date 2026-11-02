import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState, persist } from "@/lib/studio/store";
import {
  StudioError,
  filteredState,
  requirePermission,
} from "@/lib/studio/permissions";
import {
  verificationPreflight,
  startVerificationPack,
  advanceVerificationPacks,
  VERIFICATION_QUERY,
} from "@/lib/studio/verification-pack";
import { retrievePublicReferences } from "@/lib/studio/public-retrieval";
import { POST as executeWorker } from "../worker/route";
import { failure } from "@/lib/studio/http";
export const maxDuration = 180;
const start = z
  .object({
    action: z.literal("start"),
    idempotencyKey: z.string().uuid(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .strict();
const advance = z
  .object({ action: z.literal("advance"), runId: z.string().uuid() })
  .strict();
export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 2000)
      throw new StudioError(413, "Request too large.");
    const { db, actor } = await authenticate(req);
    let state = await loadState(db, actor);
    const input = z
      .discriminatedUnion("action", [start, advance])
      .parse(await req.json());
    requirePermission(state, actor, "settings.manage");
    if (process.env.STUDIO_ALLOW_PROVIDER_EXECUTION !== "true")
      throw new StudioError(
        503,
        "Paid provider execution is disabled on this deployment. No new sample call was started.",
      );
    const workerToken = process.env.STUDIO_WORKER_TOKEN;
    if (!workerToken || workerToken.length < 32)
      throw new StudioError(
        503,
        "The server worker token is not configured. An operator must configure STUDIO_WORKER_TOKEN before running live samples; do not paste it into chat.",
      );
    if (input.action === "start") {
      if (
        state.verificationRuns?.some(
          (r) =>
            r.createdBy === actor.email &&
            r.idempotencyKey === input.idempotencyKey,
        )
      )
        return NextResponse.json({
          state: filteredState(state, actor),
          actor,
          mode: "live",
        });
      if (state.version !== input.expectedVersion)
        throw new StudioError(
          409,
          "Workspace changed. Refresh before preparing the sample.",
        );
      verificationPreflight(state, actor);
      const refs = await retrievePublicReferences(VERIFICATION_QUERY);
      const next = startVerificationPack(
        state,
        actor,
        input.idempotencyKey,
        refs,
      );
      await persist(db, state, next);
      state = next;
    } else {
      const run = state.verificationRuns?.find(
        (r) => r.id === input.runId && r.createdBy === actor.email,
      );
      if (!run)
        throw new StudioError(404, "Your verification sample was not found.");
      const next = advanceVerificationPacks(state);
      if (next !== state) {
        await persist(db, state, next);
        state = next;
      }
      const current = state.verificationRuns!.find((r) => r.id === run.id)!;
      const ids = current.cases.flatMap((c) => [c.ideaJobId, c.writingJobId]);
      const queued = state.jobs.find(
        (j) =>
          ids.includes(j.id) &&
          j.createdBy === actor.email &&
          j.state === "queued",
      );
      if (queued) {
        // Call the existing authenticated lease/settlement handler in-process. No secret
        // is returned to the browser, and this action cannot dispatch unrelated jobs.
        const result = await executeWorker(
          new NextRequest(
            `https://studio.internal/api/studio/worker?jobId=${encodeURIComponent(queued.id)}`,
            {
              method: "POST",
              headers: { authorization: `Bearer ${workerToken}` },
            },
          ),
        );
        if (!result.ok) {
          const problem = await result.json();
          throw new StudioError(
            result.status,
            problem.error ||
              "Sample execution needs attention. Check the saved job before retrying.",
          );
        }
        state = await loadState(db, actor);
        const advanced = advanceVerificationPacks(state);
        if (advanced !== state) {
          await persist(db, state, advanced);
          state = advanced;
        }
      }
    }
    return NextResponse.json(
      { state: filteredState(state, actor), actor, mode: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
