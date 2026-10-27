import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authenticate, loadState } from "@/lib/studio/store";
import { googleConfig, signGoogleState } from "@/lib/studio/google";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    await loadState(db, actor);
    const config = googleConfig(),
      nonce = randomBytes(32).toString("base64url"),
      state = signGoogleState({
        ...actor,
        nonce,
        expires: Date.now() + 600000,
      });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirect,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/documents.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    }).toString();
    const response = NextResponse.json({ url: url.href });
    response.cookies.set("studio-google-state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.origin.startsWith("https:"),
      maxAge: 600,
      path: "/api/studio/google/callback",
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
