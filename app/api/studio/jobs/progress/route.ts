import {compactJobStatus} from "@/lib/studio/poll-status";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/studio/store";
import {
  StudioError,
} from "@/lib/studio/permissions";
import { POST as executeWorker } from "../../worker/route";
import { failure } from "@/lib/studio/http";
export const maxDuration = 180;
export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 1000)
      throw new StudioError(413, "Request too large.");
    const { db, actor } = await authenticate(req),
      input = z
        .object({ jobId: z.string().min(1).max(150) })
        .strict()
        .parse(await req.json());
    const summary=await compactJobStatus(db,actor,input.jobId);
    if(!["text","ideas","review","image"].includes(summary.kind))throw new StudioError(404,"Your authorized content job was not found.");
    const expiredSummary=summary.state==="running"&&Boolean(summary.leaseUntil&&summary.leaseUntil<new Date().toISOString());
    if(summary.state!=="queued"&&!expiredSummary&&!(summary.state==="unknown"&&summary.leaseId))return NextResponse.json({jobId:summary.id,status:summary.state},{headers:{"Cache-Control":"no-store"}});
    // The compact RPC already checks current ownership and scoped job authority.
    // The worker reloads current state and rechecks source access, budgets and CAS
    // before dispatch. Loading the same full workspace here duplicates that read.
    const token = process.env.STUDIO_WORKER_TOKEN;
    if (!token || token.length < 32)
      throw new StudioError(
        503,
        "The server worker token is not configured. Ask the deployment operator to configure it in server settings.",
      );
    const outcome = await executeWorker(
      new NextRequest(
        `https://studio.internal/api/studio/worker?jobId=${encodeURIComponent(summary.id)}`,
        { method: "POST", headers: { authorization: `Bearer ${token}` } },
      ),
    );
    const result = await outcome.json();
    if (!outcome.ok) {
      throw new StudioError(
        outcome.status,
        result.error ||
          "Job execution needs attention. Inspect the saved job before retrying.",
      );
    }
    return NextResponse.json(
      { jobId:summary.id,status:result.state,recovered:result.recovered, message:result.message },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
