import {studioDatabaseError} from "./database-errors";
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { StudioError, memberFor } from "./permissions";
import { initialState, EMPTY_MEDIA } from "./seed";
import type { StudioState, Actor, Role } from "./types";
export function database(timeoutMs?:number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new StudioError(
      503,
      "Configure Supabase before using the live workspace.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(timeoutMs?{global:{fetch:(url:RequestInfo|URL,init?:RequestInit)=>fetch(url,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)})}}:{}),
  });
}
export async function authenticate(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) throw new StudioError(401, "Sign in to continue.");
  const db = database(),
    { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at)
    throw new StudioError(401, "A verified signed-in account is required.");
  return {
    db,
    actor: { id: data.user.id, email: data.user.email.toLowerCase() } as Actor,
  };
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function loadState(
  db: ReturnType<typeof database>,
  actor: Actor,
): Promise<StudioState> {
  const { data, error } = await db
    .from("studio_workspace")
    .select("state")
    .eq("id", true)
    .maybeSingle();
  if (error) throw studioDatabaseError(error,"read");
  if (data) {
    const state = data.state as StudioState;
    memberFor(state, actor);
    return state;
  }
  const { data: members, error: memberError } = await db
    .from("members")
    .select("*");
  if (memberError)
    throw studioDatabaseError(memberError,"membership");
  const caller = members?.find((m) => m.email === actor.email && !m.revoked_at);
  if (!caller) throw new StudioError(403, "This workspace is invite-only.");
  if (caller.role !== "admin")
    throw new StudioError(
      503,
      "An existing administrator must initialize Studio first.",
    );
  const state = initialState(actor);
  state.members = members!.map((m) => ({
    id: m.email === actor.email ? actor.id : crypto.randomUUID(),
    email: m.email,
    roles: (m.role === "admin"
      ? ["administrator"]
      : ["editor", "creator"]) as Role[],
    grants: [],
    revoked: Boolean(m.revoked_at),
  }));
  const { data: drafts } = await db.from("drafts").select("*");
  for (const d of drafts || []) {
    state.contents.push({
      id: d.id,
      channel: d.channel,
      account: "RyzaLab",
      title: d.title,
      format: d.format,
      text: d.content,
      metadata:
        "Imported legacy draft. Previous review status is not a release approval.",
      media: {
        ...structuredClone(EMPTY_MEDIA),
        slides: (d.slides || []).map((s: { title: string; body: string }) => ({
          ...s,
          id: crypto.randomUUID(),
          color: "#0B3A42",
          background: "#F8F6EE",
          x: 8,
          y: 22,
          fontSize: 72,
        })),
      },
      assignedTo: actor.email,
      revision: 1,
      textRevision: 1,
      mediaRevision: 1,
      history: [],
      state: "draft",
      createdBy: actor.email,
      updatedAt: d.created_at,
    });
  }
  const { error: commitError } = await db.rpc("studio_commit", {
    p_expected_version: -1,
    p_state: state,
  });
  if (commitError) {
    const retry = await db
      .from("studio_workspace")
      .select("state")
      .eq("id", true)
      .maybeSingle();
    if (retry.data) {
      memberFor(retry.data.state, actor);
      return retry.data.state;
    }
    throw studioDatabaseError(commitError,"initialize");
  }
  return state;
}
export async function persist(
  db: ReturnType<typeof database>,
  previous: StudioState,
  next: StudioState,
  secret?: { id: string; ciphertext: string },
) {
  if (next.version === previous.version) return;
  if (next.version < previous.version)
    throw new StudioError(409, "Cannot persist an older workspace version.");
  // Several authorized domain transitions may form one atomic operation. The
  // database CAS advances once per commit, not once per internal transition.
  next.version = previous.version + 1;
  const { error } = await db.rpc("studio_commit", {
    p_expected_version: previous.version,
    p_state: next,
    p_secret: secret || null,
  });
  if (error) {
    if(error.code === "22P05")throw new StudioError(400,"This content contains unsupported binary characters. For ZIP packages, refresh and re-upload to exclude macOS metadata files. Keep any manual edits before refreshing.");
    if (error.code === "40001")
      throw new StudioError(
        409,
        "Workspace changed concurrently. Refresh and repeat your action. No edits or provider calls were silently repeated.",
      );
    throw studioDatabaseError(error,"save");
  }
}
function encryptionKey() {
  const raw = process.env.STUDIO_ENCRYPTION_KEY;
  if (!raw)
    throw new StudioError(
      503,
      "Set a server-only STUDIO_ENCRYPTION_KEY (32 random bytes, base64) before saving credentials.",
    );
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new StudioError(
      503,
      "STUDIO_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  return key;
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}
export function decrypt(value: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1")
    throw new StudioError(503, "Unsupported credential encryption version.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
