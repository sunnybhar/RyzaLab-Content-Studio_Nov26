import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState } from "@/lib/studio/store";
import {
  StudioError,
  requirePermission,
  filteredState,
} from "@/lib/studio/permissions";
import { canDispatchJob } from "@/lib/studio/dispatch-permissions";
import { POST as executeWorker } from "../../worker/route";
import { failure } from "@/lib/studio/http";
export const maxDuration = 180;
export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 1000)
      throw new StudioError(413, "Request too large.");
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor),
      input = z
        .object({ jobId: z.string().min(1).max(150) })
        .strict()
        .parse(await req.json());
    const job = state.jobs.find(
      (j) => j.id === input.jobId && j.createdBy === actor.email,
    );
    if (!job || !["text", "ideas", "review"].includes(job.kind))
      throw new StudioError(
        404,
        "Your authorized written-content job was not found.",
      );
    requirePermission(state, actor, "job.create", {
      channel: job.channel,
      contentId: job.contentId,
      function: job.kind,
      account: job.account,
      assignedTo: state.contents.find((c) => c.id === job.contentId)
        ?.assignedTo,
    });
    const expired =
      job.state === "running" &&
      Boolean(job.leaseUntil && job.leaseUntil < new Date().toISOString());
    if (job.state !== "queued" && !expired)
      return NextResponse.json({
        state: filteredState(state, actor),
        actor,
        mode: "live",
      });
    if (!expired && !canDispatchJob(state, actor, job))
      throw new StudioError(
        409,
        "Job access, draft or source context changed. Inspect the saved request.",
      );
    const token = process.env.STUDIO_WORKER_TOKEN;
    if (!token || token.length < 32)
      throw new StudioError(
        503,
        "The server worker token is not configured. Ask the deployment operator to configure it in server settings.",
      );
    const outcome = await executeWorker(
      new NextRequest(
        `https://studio.internal/api/studio/worker?jobId=${encodeURIComponent(job.id)}`,
        { method: "POST", headers: { authorization: `Bearer ${token}` } },
      ),
    );
    if (!outcome.ok) {
      const result = await outcome.json();
      throw new StudioError(
        outcome.status,
        result.error ||
          "Job execution needs attention. Inspect the saved job before retrying.",
      );
    }
    const next = await loadState(db, actor);
    return NextResponse.json(
      { state: filteredState(next, actor), actor, mode: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
