import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { database, persist } from "@/lib/studio/store";
import { StudioError } from "@/lib/studio/permissions";
import type { StudioState } from "@/lib/studio/types";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const configured = process.env.STUDIO_WORKER_TOKEN,
      provided =
        req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
    if (
      !configured ||
      configured.length < 32 ||
      Buffer.byteLength(configured) !== Buffer.byteLength(provided) ||
      !timingSafeEqual(Buffer.from(configured), Buffer.from(provided))
    )
      throw new StudioError(401, "Worker authorization required.");
    if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM)
      throw new StudioError(
        503,
        "Configure the transactional email adapter and verified sender. Password login does not require it.",
      );
    const db = database(),
      { data } = await db
        .from("studio_workspace")
        .select("state")
        .eq("id", true)
        .single();
    const state = data?.state as StudioState | undefined;
    if (!state || !state.settings.emailEnabled)
      return NextResponse.json({ message: "Email delivery is disabled." });
    const { data: existing, error: deliveryError } = await db
      .from("studio_deliveries")
      .select("id");
    if (deliveryError)
      throw new StudioError(
        503,
        "Apply the notification outbox migration first.",
      );
    const ids = new Set((existing || []).map((e) => e.id));
    const notice = state.notices.find(
      (n) =>
        !ids.has(`${n.eventId}:${n.user}`) &&
        state.members.some((m) => m.email === n.user && !m.revoked),
    );
    if (!notice)
      return NextResponse.json({ message: "No undelivered notifications." });
    const deliveryId = `${notice.eventId}:${notice.user}`,
      { error: claimError } = await db
        .from("studio_deliveries")
        .insert({ id: deliveryId, status: "claimed" });
    if (claimError)
      return NextResponse.json({ message: "This event was already claimed." });
    let status = "unknown",
      providerId: string | undefined;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
          "content-type": "application/json",
          "Idempotency-Key": deliveryId,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [notice.user],
          subject: `RyzaLab Studio: ${notice.title}`,
          text:
            notice.body +
            "\n\nOpen your Studio workspace to review this event.",
        }),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      });
      if (response.ok) {
        const body = await response.json();
        providerId = body.id;
        status = "sent";
      } else if ([400, 401, 403, 422, 429].includes(response.status))
        status = "failed";
    } catch {}
    await db
      .from("studio_deliveries")
      .update({ status, provider_id: providerId })
      .eq("id", deliveryId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const fresh = await db
          .from("studio_workspace")
          .select("state")
          .eq("id", true)
          .single(),
        previous = fresh.data?.state as StudioState;
      if (!previous) break;
      const next = structuredClone(previous),
        n = next.notices.find((n) => n.id === notice.id);
      if (n) n.emailState = status === "sent" ? "sent" : "failed";
      next.version++;
      next.audit.push({
        id: crypto.randomUUID(),
        actor: "studio-email-worker",
        action: `email.${status}`,
        target: notice.id,
        at: new Date().toISOString(),
      });
      try {
        await persist(db, previous, next);
        break;
      } catch (e) {
        if (!(e instanceof StudioError && e.code === 409)) throw e;
      }
    }
    return NextResponse.json({
      status,
      message:
        status === "unknown"
          ? "Delivery outcome unknown; no automatic resend. Reconcile the outbox."
          : undefined,
    });
  } catch (e) {
    return failure(e);
  }
}
