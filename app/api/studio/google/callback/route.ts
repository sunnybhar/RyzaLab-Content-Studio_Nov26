import { NextRequest, NextResponse } from "next/server";
import { database, loadState, persist, encrypt } from "@/lib/studio/store";
import { googleConfig, verifyGoogleState } from "@/lib/studio/google";
import { StudioError } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";
export async function GET(req: NextRequest) {
  try {
    const state = verifyGoogleState(
        req.nextUrl.searchParams.get("state") || "",
      ),
      nonce = req.cookies.get("studio-google-state")?.value;
    if (!nonce || nonce !== state.nonce)
      throw new StudioError(
        400,
        "Google connection state did not match this browser.",
      );
    const code = req.nextUrl.searchParams.get("code");
    if (!code)
      throw new StudioError(400, "Google authorization was not granted.");
    const config = googleConfig(),
      db = database(),
      actor = { id: state.id, email: state.email },
      previous = await loadState(db, actor);
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirect,
        code,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw new StudioError(
        502,
        "Google authorization exchange failed. Start the connection again.",
      );
    const tokens = await r.json(),
      next = structuredClone(previous);
    next.version++;
    next.audit.push({
      id: crypto.randomUUID(),
      actor: actor.email,
      action: "google.docs_connected",
      target: actor.id,
      at: new Date().toISOString(),
    });
    await persist(db, previous, next, {
      id: `google:${actor.id}`,
      ciphertext: encrypt(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires: Date.now() + tokens.expires_in * 1000,
        }),
      ),
    });
    const response = NextResponse.redirect(
      config.origin + "/studio?google=connected",
    );
    response.cookies.delete("studio-google-state");
    return response;
  } catch (e) {
    return failure(e);
  }
}
