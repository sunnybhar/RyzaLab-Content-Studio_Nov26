import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { commandSchema } from "./commands";
import { settleWrittenOutput } from "./draft-candidates";
import { applyCommand } from "./engine";
import { generationInput } from "./generation";
import { discoverModels } from "./model-discovery";
import { requirePermission, StudioError } from "./permissions";
import { effectiveRates, quote, type Rate } from "./pricing";
import { ProviderFailure, runProvider, validateConnection } from "./providers";
import { RESEARCH_PRICE } from "./research-budget";
import { DEMO_ACTOR } from "./seed";
import type { Connection, StudioState } from "./types";
import { settleUsageCost } from "./usage-cost";

const providerSchema = z.enum(["anthropic", "openai", "google"]);
const textFunctions = z.enum(["text", "ideas", "review"]);
const connectionInput = z.object({
  id: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
  title: z.string().trim().min(1).max(100),
  provider: providerSchema,
  function: textFunctions,
  model: z.string().regex(/^[A-Za-z0-9_.:/-]{1,150}$/),
  key: z.string().trim().min(1).max(1024).optional(),
});

type Database = <T>(fn: (database: DatabaseSync) => T) => T;

function workspace(db: DatabaseSync) {
  const row = db.prepare("SELECT revision, state FROM workspace WHERE id = 1").get();
  if (!row) throw new StudioError(409, "Open your local workspace first.");
  return { revision: Number(row.revision), state: JSON.parse(String(row.state)) as StudioState };
}

function write(db: DatabaseSync, revision: number, state: StudioState) {
  const result = db.prepare(
    "UPDATE workspace SET state = ?, revision = revision + 1 WHERE id = 1 AND revision = ?",
  ).run(JSON.stringify(state), revision);
  if (!result.changes) throw new StudioError(409, "The local workspace changed. Refresh before retrying.");
  return { state, revision: revision + 1 };
}

function transaction<T>(db: DatabaseSync, action: () => T) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = action();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function encryptionKey(create = false) {
  const path = join(process.cwd(), ".studio-local", "credentials.key");
  if (create) {
    try {
      writeFileSync(path, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return readFileSync(path);
}

function storedKey(db: DatabaseSync, id: string) {
  const row = db.prepare("SELECT ciphertext FROM credentials WHERE id = ?").get(id);
  if (!row) throw new StudioError(409, "Enter the provider API key in AI Connections.");
  const [iv, tag, value] = String(row.ciphertext).split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value, "base64")), decipher.final()]).toString("utf8");
}

function saveKey(db: DatabaseSync, id: string, value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(true), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  db.prepare("INSERT OR REPLACE INTO credentials (id, ciphertext) VALUES (?, ?)")
    .run(id, [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64")).join("."));
}

function writingRates(state: StudioState): Rate[] {
  return [
    ...effectiveRates(state),
    {
      provider: "anthropic",
      model: RESEARCH_PRICE.model,
      function: "text",
      currency: "USD",
      inputCentsPerMillion: RESEARCH_PRICE.inputCentsPerMillion,
      outputCentsPerMillion: RESEARCH_PRICE.outputCentsPerMillion,
      maxInputBytes: 65536,
      maxOutputTokens: 4096,
      source: RESEARCH_PRICE.tokenSource,
      verifiedAt: RESEARCH_PRICE.verifiedAt,
      qualified: true,
    },
  ];
}

export async function localAI(withDatabase: Database, revision: number, unknown: unknown) {
  const command = z.object({ type: z.string() }).passthrough().parse(unknown);
  const current = withDatabase(workspace);
  if (revision !== current.revision) throw new StudioError(409, "The local workspace changed. Refresh before retrying.");
  const { state } = current;
  if (command.type === "connection.models") {
    const input = connectionInput.pick({ provider: true, function: true, key: true }).extend({connectionId: z.string().optional()}).parse(command);
    requirePermission(state, DEMO_ACTOR, "connections.manage", { function: input.function });
    const existing = state.connections.find((c) => c.id === input.connectionId && c.provider === input.provider && c.function === input.function);
    const key = input.key || (existing && withDatabase((db) => storedKey(db, existing.id)));
    if (!key) throw new StudioError(400, "Enter an API key to load your account models.");
    return { models: await discoverModels(input.provider, key) };
  }
  if (command.type === "connection.save" || command.type === "connection.validate") {
    const input = command.type === "connection.save" ? connectionInput.parse(command) : undefined;
    const id = input ? input.id || crypto.randomUUID() : z.string().parse(command.id);
    const existing = state.connections.find((c) => c.id === id);
    if ((!input || input.id) && !existing) throw new StudioError(404, "Connection not found.");
    if (input && existing && (input.expectedUpdatedAt !== existing.updatedAt || input.function !== existing.function))
      throw new StudioError(409, "Connection changed. Open it again.");
    const connection: Connection = input ? {
      ...existing, id, title: input.title, provider: input.provider, model: input.model,
      function: input.function, hasKey: true, status: "validated", updatedAt: new Date().toISOString(),
    } : { ...existing!, status: "validated", updatedAt: new Date().toISOString() };
    requirePermission(state, DEMO_ACTOR, "connections.manage", { function: connection.function });
    if (state.jobs.some((j) => j.connectionId === id && ["queued", "running", "unknown"].includes(j.state)))
      throw new StudioError(409, "Resolve outstanding AI requests before editing this connection.");
    if (!input?.key && (!existing || existing.provider !== connection.provider || !existing.hasKey))
      throw new StudioError(400, "Enter the API key for this provider.");
    const key = input?.key || withDatabase((db) => storedKey(db, id));
    await validateConnection(connection, key);
    if (existing) Object.assign(existing, connection);
    else state.connections.push(connection);
    state.settings.defaultConnections ??= {};
    state.settings.defaultConnections[connection.function] ??= id;
    state.version++;
    return withDatabase((db) => transaction(db, () => {
      const saved = write(db, revision, state);
      if (input?.key) saveKey(db, id, input.key);
      return saved;
    }));
  }
  if (command.type === "connection.delete" || command.type === "connection.disconnect") {
    const next = applyCommand(state, DEMO_ACTOR, command);
    return withDatabase((db) => transaction(db, () => {
      const saved = write(db, revision, next);
      db.prepare("DELETE FROM credentials WHERE id = ?").run(z.string().parse(command.id));
      return saved;
    }));
  }

  const parsed = commandSchema.parse(command);
  if (parsed.type !== "content.generate" || parsed.kind !== "text")
    throw new StudioError(400, "Local AI currently generates written drafts.");
  const previousJob = state.jobs.find((j) => j.idempotencyKey === parsed.idempotencyKey && j.createdBy === DEMO_ACTOR.email);
  if (previousJob) {
    if (previousJob.contentId !== parsed.contentId || previousJob.kind !== parsed.kind)
      throw new StudioError(409, "This generation request belongs to another draft.");
    return { ...current, job: previousJob };
  }
  const prepared = generationInput(state, DEMO_ACTOR, parsed);
  const priced = quote(state, prepared, writingRates(state));
  const connection = state.connections.find((c) => c.id === prepared.connectionId)!;
  const key = withDatabase((db) => storedKey(db, connection.id));
  const requestCap = state.settings.requestCap;
  const allowance = (connection as Connection & {maxRequestCost?: number}).maxRequestCost;
  const budgetState = structuredClone(state);
  budgetState.settings.requestCap ||= budgetState.settings.monthlyCap;
  const budgetConnection = budgetState.connections.find((c) => c.id === connection.id)!;
  Object.assign(budgetConnection, { maxRequestCost: allowance || priced.cost });
  const next = applyCommand(budgetState, DEMO_ACTOR, {...prepared, confirmed: true}, {
    quotedCost: priced.cost, pricingSnapshot: priced.pricingSnapshot, canonicalGeneration: true,
  });
  next.settings.requestCap = requestCap;
  const nextConnection = next.connections.find((c) => c.id === connection.id)!;
  Object.assign(nextConnection, { maxRequestCost: allowance });
  const job = next.jobs.find((j) => j.idempotencyKey === prepared.idempotencyKey)!;
  job.state = "running";
  job.attempt = 1;
  withDatabase((db) => write(db, revision, next));

  let output: Awaited<ReturnType<typeof runProvider>> | undefined;
  let problem: ProviderFailure | undefined;
  try {
    output = await runProvider(job, connection, key);
  } catch (error) {
    problem = error instanceof ProviderFailure ? error : new ProviderFailure(true, "Provider outcome is uncertain. The reservation is retained.");
  }
  return withDatabase((db) => transaction(db, () => {
    const latest = workspace(db);
    const result = latest.state.jobs.find((j) => j.id === job.id);
    if (!result || result.state !== "running")
      throw new StudioError(409, "The recorded request changed. Check its outcome before generating again.");
    if (problem) {
      result.state = problem.ambiguous ? "unknown" : "failed";
      result.error = problem.message;
      if (!problem.ambiguous) result.reserved = 0;
    } else {
      result.state = "succeeded";
      result.result = output?.text;
      result.providerCompletion = output?.completion;
      result.providerStopReason = output?.stopReason;
      settleWrittenOutput(latest.state, result, output || {}, new Date().toISOString());
      if (output?.usage) settleUsageCost(result, output.usage);
      else if (output?.standardUsage) settleUsageCost(result, output.standardUsage, true);
      if (result.reserved && !result.error)
        result.error = "Provider completed. The quoted allowance remains reserved until the cost is reconciled.";
    }
    latest.state.version++;
    return { ...write(db, latest.revision, latest.state), job: result };
  }));
}
