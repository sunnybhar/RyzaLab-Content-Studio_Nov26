import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { StudioError } from "./permissions";
import { decrypt, encrypt, type database } from "./store";
export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET,
    app = process.env.STUDIO_APP_URL,
    signing = process.env.STUDIO_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !app || !signing)
    throw new StudioError(
      503,
      "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STUDIO_APP_URL and STUDIO_ENCRYPTION_KEY to connect Google Docs.",
    );
  const origin = new URL(app).origin;
  return {
    clientId,
    clientSecret,
    redirect: `${origin}/api/studio/google/callback`,
    origin,
    signing,
  };
}
export function signGoogleState(data: object) {
  const { signing } = googleConfig(),
    body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return (
    body +
    "." +
    createHmac("sha256", signing)
      .update("google-oauth:" + body)
      .digest("base64url")
  );
}
export function verifyGoogleState(value: string) {
  const { signing } = googleConfig(),
    [body, signature] = value.split("."),
    expected = createHmac("sha256", signing)
      .update("google-oauth:" + body)
      .digest("base64url");
  if (
    !signature ||
    Buffer.byteLength(signature) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new StudioError(400, "Invalid OAuth state.");
  const data = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    id: string;
    email: string;
    nonce: string;
    expires: number;
  };
  if (data.expires < Date.now())
    throw new StudioError(400, "Google connection expired; start again.");
  return data;
}
export async function googleAccess(
  db: ReturnType<typeof database>,
  userId: string,
) {
  const { data } = await db
    .from("studio_secrets")
    .select("ciphertext")
    .eq("id", `google:${userId}`)
    .maybeSingle();
  if (!data)
    throw new StudioError(503, "Connect your Google Docs account first.");
  const token = JSON.parse(decrypt(data.ciphertext));
  if (token.expires > Date.now() + 30000) return token.access_token as string;
  const config = googleConfig();
  if (!token.refresh_token)
    throw new StudioError(
      503,
      "Google access expired. Reconnect your account.",
    );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new StudioError(
      503,
      "Google access was revoked or could not refresh. Reconnect the account.",
    );
  const next = await response.json();
  await db
    .from("studio_secrets")
    .update({
      ciphertext: encrypt(
        JSON.stringify({
          ...token,
          access_token: next.access_token,
          expires: Date.now() + next.expires_in * 1000,
        }),
      ),
    })
    .eq("id", `google:${userId}`);
  return next.access_token as string;
}
