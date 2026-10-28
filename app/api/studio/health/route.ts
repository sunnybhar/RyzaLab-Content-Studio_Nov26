import { NextRequest, NextResponse } from "next/server";
import { authenticate, loadState } from "@/lib/studio/store";
import { requirePermission } from "@/lib/studio/permissions";
import { operationsSummary } from "@/lib/studio/operations";
import { failure } from "@/lib/studio/http";
export async function GET(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    requirePermission(state, actor, "settings.manage");
    const bucket = await db.storage.getBucket("studio-assets");
    const deliveries = await db.from("studio_deliveries").select("status");
    return NextResponse.json(
      {
        summary: operationsSummary(state),
        checks: {
          database: "reachable",
          assetStorage: bucket.error
            ? "unavailable"
            : bucket.data.public
              ? "incorrectly_public"
              : "private_bucket_present",
          encryptionConfigured:
            Buffer.from(process.env.STUDIO_ENCRYPTION_KEY || "", "base64")
              .length === 32,
          providerExecutionEnabled:
            process.env.STUDIO_ALLOW_PROVIDER_EXECUTION === "true",
          googleConfigured: Boolean(
            process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
          ),
          emailEnabled: state.settings.emailEnabled,
          emailConfigured: Boolean(
            process.env.EMAIL_API_KEY && process.env.EMAIL_FROM,
          ),
          deliveryOutbox: deliveries.error ? "unavailable" : "reachable",
          failedDeliveries:
            deliveries.data?.filter(
              (d) => d.status === "failed" || d.status === "unknown",
            ).length || 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
