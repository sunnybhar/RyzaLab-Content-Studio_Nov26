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
    (request.method === "GET" || request.headers.get("origin") === `http://${host}`)
  );
}

function withDatabase<T>(run: (database: DatabaseSync) => T): T {
  const directory = join(process.cwd(), ".studio-local");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(join(directory, "studio.sqlite"));
  try {
    database.exec(`
      PRAGMA busy_timeout = 5000;
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
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Expected a JSON command." }, { status: 415, headers });
  try {
    const body = await request.json();
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
