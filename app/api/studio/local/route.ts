import { localVoicePdfLimit } from "@/lib/studio/voice-archive";
import { localAI } from "@/lib/studio/local-ai";
import { StudioError } from "@/lib/studio/permissions";
import { ZodError } from "zod";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const runtime = "nodejs";

const hosts = new Set(["localhost:3005", "127.0.0.1:3005"]);
const headers = { "Cache-Control": "no-store" };

function allowed(request: Request) {
  const host = request.headers.get("host");
  const site = request.headers.get("sec-fetch-site");
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_STUDIO_LOCAL === "1" &&
    host !== null &&
    hosts.has(host) &&
    (!site || site === "same-origin" || site === "none") &&
    (["GET", "HEAD"].includes(request.method) || request.headers.get("origin") === `http://${host}`)
  );
}

function withDatabase<T>(run: (database: DatabaseSync) => T): T {
  const directory = join(process.cwd(), ".studio-local");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(join(directory, "studio.sqlite"));
  try {
    database.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS local_media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS credentials (id TEXT PRIMARY KEY, ciphertext TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workspace (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        revision INTEGER NOT NULL,
        state TEXT NOT NULL
      );
    `);
    return run(database);
  } finally {
    database.close();
  }
}

export function GET(request: Request) {
  if (!allowed(request)) return new Response(null, { status: 404 });
  try {
    const media = new URL(request.url).searchParams.get("media");
    if (media !== null) {
      if (!/^[0-9a-f-]{36}$/i.test(media)) return new Response(null, { status: 404 });
      const row = withDatabase((db) =>
        db.prepare("SELECT mime, bytes FROM local_media WHERE id = ?").get(media),
      );
      if (!row || !(row.bytes instanceof Uint8Array)) return new Response(null, { status: 404 });
      const bytes = Uint8Array.from(row.bytes);
      const mediaHeaders = { ...headers, "Content-Type": String(row.mime), "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" };
      const range = request.headers.get("range");
      if (!range)
        return new Response(bytes, { headers: { ...mediaHeaders, "Content-Length": String(bytes.length) } });
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
      const end = match?.[1] && match[2] ? Math.min(bytes.length - 1, Number(match[2])) : bytes.length - 1;
      if (!match || (!match[1] && !match[2]) || start > end || start >= bytes.length)
        return new Response(null, { status: 416, headers: { ...mediaHeaders, "Content-Range": `bytes */${bytes.length}` } });
      return new Response(bytes.slice(start, end + 1), {
        status: 206,
        headers: {
          ...mediaHeaders,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
        },
      });
    }
    const row = withDatabase((db) =>
      db.prepare("SELECT revision, state FROM workspace WHERE id = 1").get(),
    );
    return Response.json(
      row ? { revision: row.revision, state: JSON.parse(String(row.state)) } : {},
      { headers },
    );
  } catch {
    return Response.json({ error: "Could not read the local Studio database." }, { status: 500, headers });
  }
}

export async function PUT(request: Request) {
  if (!allowed(request)) return new Response(null, { status: 404 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Expected a JSON workspace." }, { status: 415, headers });

  const body = await request.json().catch(() => null);
  const { revision, state } = body ?? {};
  if (
    (revision !== null && (!Number.isSafeInteger(revision) || revision < 1)) ||
    !Number.isSafeInteger(state?.version) ||
    state.version < 0 ||
    !Array.isArray(state.members) ||
    !Array.isArray(state.contents) ||
    !state.settings
  ) {
    return Response.json({ error: "Invalid local workspace." }, { status: 400, headers });
  }

  const snapshot = JSON.stringify(state);
  try {
    const result = withDatabase((db) =>
      revision === null
        ? db.prepare("INSERT OR IGNORE INTO workspace VALUES (1, 1, ?)").run(snapshot)
        : db.prepare("UPDATE workspace SET state = ?, revision = revision + 1 WHERE id = 1 AND revision = ?").run(snapshot, revision),
    );
    if (!result.changes) {
      return Response.json(
        { error: "The local workspace changed. Refresh before retrying your edit." },
        { status: 409, headers },
      );
    }
    return Response.json({ revision: (revision ?? 0) + 1 }, { headers });
  } catch {
    return Response.json({ error: "Could not save the local Studio database." }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  if (!allowed(request)) return new Response(null, { status: 404 });
  const contentType = request.headers.get("content-type") || "";
  try {
    let body;
    if (contentType.startsWith("multipart/form-data")) {
      const length = Number(request.headers.get("content-length") || 0);
      if (length > localVoicePdfLimit + 65536)
        return Response.json({ error: "PDF exceeds 128 MB." }, { status: 413, headers });
      const form = await request.formData();
      const payload = form.get("payload");
      const pdf = form.get("pdf");
      body = typeof payload === "string" ? JSON.parse(payload) : null;
      if (body?.command?.type !== "agentVoice.create" || !(pdf instanceof Blob) || pdf.size > localVoicePdfLimit)
        return Response.json({ error: "Choose a valid PDF up to 128 MB." }, { status: 400, headers });
      body.command.archivePdf = new Uint8Array(await pdf.arrayBuffer());
    } else if (contentType.startsWith("application/json")) {
      body = await request.json();
    } else {
      return Response.json({ error: "Expected a JSON command or PDF upload." }, { status: 415, headers });
    }
    if (!Number.isSafeInteger(body?.revision) || body.revision < 1)
      return Response.json({ error: "Refresh your local workspace first." }, { status: 409, headers });
    return Response.json(await localAI(withDatabase, body.revision, body.command), { headers });
  } catch (error) {
    const status = error instanceof StudioError ? error.code : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500;
    const message = error instanceof StudioError ? error.message :
      status === 400 ? "Invalid local AI request." : "Local AI operation failed. Check Generation activity before retrying.";
    return Response.json({ error: message }, { status, headers });
  }
}
