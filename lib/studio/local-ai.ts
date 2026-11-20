import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { extractAgentFile } from "./agent-file-extract";
import { commandSchema } from "./commands";
import { automaticIdeaResearch } from "./automatic-idea-research";
import { ideaJobInput } from "./idea-generation";
import { publicRetrievalTarget } from "./research-link";
import { researchProfile } from "./research-profile";
import { preparationFor } from "./preparation-budget";
import { retrieveBroadReferences } from "./web-discovery";
import { readPublicPage } from "./public-page";
import { applyWorkerReceipt } from "./worker-receipt";
import { applyCommand } from "./engine";
import { generationInput } from "./generation";
import { discoverModels } from "./model-discovery";
import { requirePermission, StudioError } from "./permissions";
import { effectiveRates, quote, type Rate } from "./pricing";
import { ProviderFailure, runProvider, validateConnection } from "./providers";
import { RESEARCH_PRICE } from "./research-budget";
import { DEMO_ACTOR } from "./seed";
import type { Connection, StudioState } from "./types";
import { resolvedConnection } from "./solo-quality";
import { checkLocalVideo, LocalVideoFailed, localVideoModel, startLocalVideo } from "./local-video";
import { settleUsageCost } from "./usage-cost";

const providerSchema = z.enum(["anthropic", "openai", "google"]);
const textFunctions = z.enum(["text", "ideas", "review"]);
const connectionInput = z.object({
  id: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
  title: z.string().trim().min(1).max(100),
  provider: providerSchema,
  function: z.enum(["text", "ideas", "review", "image", "video"]),
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

const localTextPricingSource =
  "https://github.com/BerriAI/litellm/blob/f508f3769e16f6f2c766a7ae96010916b648b71c/model_prices_and_context_window.json";

const localTextPricing = [
  { provider: "openai", model: "gpt-6.2-astra", inputCentsPerMillion: 800, outputCentsPerMillion: 4000 },
  { provider: "anthropic", model: "claude-opus-5-5", inputCentsPerMillion: 400, outputCentsPerMillion: 2000 },
] as const;

function localRates(state: StudioState): Rate[] {
  const rates: Rate[] = [
    ...effectiveRates(state),
    ...localTextPricing.map((rate): Rate => ({
      ...rate,
      function: "text",
      currency: "USD",
      maxInputBytes: 65536,
      maxOutputTokens: 4096,
      source: localTextPricingSource,
      verifiedAt: "2026-11-19",
      qualified: true,
      qualificationEvidence: "Standard tool-free rates cross-checked against the pinned public LiteLLM registry.",
    })),
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
  // The local text adapters use the same tool-free token rates for ideas and review.
  for (const rate of rates.filter((card) => card.function === "text" && card.fixedCents === undefined)) {
    for (const kind of ["ideas", "review"] as const) {
      if (rates.some((card) => card.provider === rate.provider && card.model === rate.model && card.function === kind)) continue;
      rates.push({ ...rate, function: kind });
    }
  }
  return rates;
}

const researchTimeoutMs = 45000;

const retrieveLocalReferences: typeof retrieveBroadReferences = async (
  query, request = fetch, now, profile, sourceUrls,
) => {
  const controller = new AbortController();
  const deadline = Date.now() + researchTimeoutMs;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new StudioError(504, "Public research took longer than 45 seconds. No paid generation was started. Try a narrower topic or add a source link."));
      controller.abort();
    }, researchTimeoutMs);
  });
  const boundedFetch: typeof fetch = (input, options) =>
    request(input, {
      ...options,
      signal: options?.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal,
    });
  try {
    return await Promise.race([
      timedOut,
      retrieveBroadReferences(query, boundedFetch, now, profile, sourceUrls, (url) => readPublicPage(url, 0, deadline)),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
};

export async function localAI(withDatabase: Database, revision: number, unknown: unknown) {
  const command = z.object({ type: z.string() }).passthrough().parse(unknown);
  const current = withDatabase(workspace);
  if (revision !== current.revision) throw new StudioError(409, "The local workspace changed. Refresh before retrying.");
  const { state } = current;
  if (command.type === "agentVoice.create") {
    const input = commandSchema.parse(command);
    if (input.type !== "agentVoice.create") throw new StudioError(400, "Invalid voice example.");
    requirePermission(state, DEMO_ACTOR, "workflow.edit", {
      channel: input.channel === "Shared" ? undefined : input.channel,
    });
    const extractedText = input.file ? await extractAgentFile(input.file) : undefined;
    const next = applyCommand(state, DEMO_ACTOR, { ...input, extractedText });
    return next === state ? current : withDatabase((db) => write(db, revision, next));
  }
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
    if (connection.function === "video") {
      if (connection.provider !== "google" || !localVideoModel.test(connection.model))
        throw new StudioError(400, "Video requires a Gemini Veo 3.1 connection.");
      if (!(await discoverModels(connection.provider, key)).includes(connection.model))
        throw new StudioError(400, "This Veo model was not returned for your account.");
    } else await validateConnection(connection, key);
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

  if (command.type === "media.check") {
    const job = state.jobs.find((entry) => entry.id === command.jobId && entry.kind === "video");
    if (!job || job.createdBy !== DEMO_ACTOR.email) throw new StudioError(404, "Video request not found.");
    if (job.state !== "running" || !job.localVideoOperation) return { ...current, job };
    const key = withDatabase((db) => storedKey(db, job.connectionId));
    let bytes: Buffer | undefined;
    let failure: string | undefined;
    try {
      bytes = await checkLocalVideo(job.localVideoOperation, key);
    } catch (error) {
      if (error instanceof LocalVideoFailed) failure = error.message;
      else throw new StudioError(502, error instanceof ProviderFailure ? error.message :
        "The video could not be downloaded. Check the same request again.");
    }
    if (!bytes && !failure) return { ...withDatabase(workspace), job };
    return withDatabase((db) => transaction(db, () => {
      const latest = workspace(db);
      const finished = latest.state.jobs.find((entry) => entry.id === job.id);
      if (!finished || finished.state !== "running") return { ...latest, job: finished };
      if (bytes) {
        db.prepare("INSERT INTO local_media VALUES (?, ?, ?)").run(job.id, "video/mp4", bytes);
        finished.state = "succeeded";
        finished.result = `/api/studio/local?media=${job.id}`;
        finished.error = "Quoted cost retained until reconciled.";
      } else {
        finished.state = "unknown";
        finished.error = failure;
      }
      latest.state.version++;
      return { ...write(db, latest.revision, latest.state), job: finished };
    }));
  }

  if (command.type === "media.quote" || command.type === "media.generate") {
    const input = z.object({
      kind: z.enum(["image", "video"]),
      contentId: z.string(),
      expectedRevision: z.number().int().positive(),
      prompt: z.string().trim().min(12).max(12000),
      maximum: z.number().int().positive().optional(),
      idempotencyKey: z.uuid().optional(),
    }).parse(command);
    const draft = state.contents.find((item) => item.id === input.contentId && !item.deletedAt);
    if (!draft || draft.revision !== input.expectedRevision || draft.state !== "draft")
      throw new StudioError(409, "Save and reopen the current draft before generating media.");
    const scope = { channel: draft.channel, contentId: draft.id, account: draft.account, assignedTo: draft.assignedTo, function: input.kind };
    requirePermission(state, DEMO_ACTOR, "content.edit", scope);
    requirePermission(state, DEMO_ACTOR, "job.create", scope);
    const connectionId = resolvedConnection(state, draft.channel, input.kind);
    const connection = state.connections.find((item) => item.id === connectionId && item.function === input.kind);
    if (!connection || (input.kind === "video"
      ? connection.provider !== "google" || !localVideoModel.test(connection.model)
      : connection.provider !== "openai" || !/^gpt-image-[a-z0-9.-]+$/i.test(connection.model)))
      throw new StudioError(409, "Choose a supported, validated connection for this function in AI Connections.");
    const fixedRates = effectiveRates(state).filter((rate) => rate.fixedCents && rate.function === input.kind);
    if (!fixedRates.some((rate) => rate.provider === connection.provider && rate.model === connection.model))
      throw new StudioError(409, "A verified fixed price for this exact image or 8-second video preset is needed before generation.");
    const prepared = {
      type: "job.enqueue", kind: input.kind, channel: draft.channel, contentId: draft.id,
      connectionId, prompt: input.prompt, estimate: input.maximum, idempotencyKey: input.idempotencyKey, confirmed: true,
    };
    const priced = quote(state, prepared, fixedRates);
    if (command.type === "media.quote") return { cost: priced.cost, model: connection.model };
    if (!input.maximum || !input.idempotencyKey || priced.cost > input.maximum)
      throw new StudioError(409, "Get and confirm the current estimate before generating.");
    const previous = state.jobs.find((entry) => entry.idempotencyKey === input.idempotencyKey && entry.createdBy === DEMO_ACTOR.email);
    if (previous) {
      if (previous.contentId !== draft.id || previous.kind !== input.kind || previous.prompt !== input.prompt)
        throw new StudioError(409, "This request ID belongs to different media.");
      return { ...current, job: previous };
    }
    if (state.jobs.some((entry) => entry.contentId === draft.id && entry.kind === input.kind &&
      ["queued", "running", "unknown", "awaiting_confirmation"].includes(entry.state)))
      throw new StudioError(409, "Check or reconcile the existing media request first.");
    const key = withDatabase((db) => storedKey(db, connection.id));
    let configured = structuredClone(state);
    configured.settings.requestCap ||= state.settings.monthlyCap;
    Object.assign(configured.connections.find((entry) => entry.id === connection.id)!, {
      maxRequestCost: (connection as Connection & { maxRequestCost?: number }).maxRequestCost || priced.cost,
    });
    const policy = configured.settings.reviewPolicy;
    const preparation = preparationFor(configured, draft, DEMO_ACTOR.email, new Date().toISOString());
    if (policy && !preparation?.functions.includes(input.kind))
      configured = applyCommand(configured, DEMO_ACTOR, {
        type: "preparation.authorize", contentId: draft.id, expectedRevision: draft.revision,
        maxCents: preparation?.maxCents || policy.packageCap, includeImages: input.kind === "image",
      });
    const next = applyCommand(configured, DEMO_ACTOR, prepared, {
      quotedCost: priced.cost, pricingSnapshot: priced.pricingSnapshot,
    });
    next.settings.requestCap = state.settings.requestCap;
    next.connections = state.connections;
    const job = next.jobs.find((entry) => entry.idempotencyKey === input.idempotencyKey)!;
    job.state = "running";
    job.attempt = 1;
    job.dispatchStartedAt = new Date().toISOString();
    withDatabase((db) => write(db, revision, next));
    let operation: string | undefined;
    let image: Uint8Array | undefined;
    let problem: ProviderFailure | undefined;
    try {
      if (job.kind === "video") operation = await startLocalVideo(connection.model, input.prompt, key);
      else image = (await runProvider(job, connection, key)).bytes;
    } catch (error) {
      problem = error instanceof ProviderFailure ? error : new ProviderFailure(true, "Media outcome is uncertain. The reservation is retained.");
    }
    return withDatabase((db) => transaction(db, () => {
      const latest = workspace(db);
      const finished = latest.state.jobs.find((entry) => entry.id === job.id);
      if (!finished || finished.state !== "running")
        throw new StudioError(409, "The recorded media job changed. Check its outcome before retrying.");
      if (problem) {
        finished.state = problem.ambiguous ? "unknown" : "failed";
        finished.error = problem.message;
        if (!problem.ambiguous) finished.reserved = 0;
      } else if (operation) {
        finished.localVideoOperation = operation;
      } else if (image) {
        db.prepare("INSERT INTO local_media VALUES (?, ?, ?)").run(job.id, "image/png", image);
        finished.state = "succeeded";
        finished.result = `/api/studio/local?media=${job.id}`;
        finished.error = "Quoted cost retained until reconciled.";
      } else {
        finished.state = "unknown";
        finished.error = "No usable media was returned. The reservation is retained.";
      }
      latest.state.version++;
      return { ...write(db, latest.revision, latest.state), job: finished };
    }));
  }

  const { publicQuery, publicSourceUrls, ...generationCommand } = command;
  const parsed = commandSchema.parse(command.type === "content.generate" ? generationCommand : command);
  let currentRevision = revision;
  async function retrieve(input: Extract<typeof parsed, {type: "research.retrieve"}>) {
    const { existing } = publicRetrievalTarget(state, DEMO_ACTOR, input);
    if (existing) return state;
    const retrievalResult = await retrieveLocalReferences(
      input.query, fetch, new Date().toISOString(), researchProfile(state, input.channel), input.sourceUrls,
    );
    return applyCommand(state, DEMO_ACTOR, input, { retrievalResult });
  }
  if (parsed.type === "research.retrieve") {
    const next = await retrieve(parsed);
    return next === state ? current : withDatabase((db) => write(db, revision, next));
  }
  if (parsed.type !== "content.generate" && parsed.type !== "idea.generate")
    throw new StudioError(400, "Unsupported local AI request.");

  const kind = parsed.type === "idea.generate" ? "ideas" : parsed.kind;
  const contentId = parsed.type === "content.generate" ? parsed.contentId : undefined;
  const previousJob = state.jobs.find((j) => j.idempotencyKey === parsed.idempotencyKey && j.createdBy === DEMO_ACTOR.email);
  if (previousJob) {
    if (previousJob.contentId !== contentId || previousJob.kind !== kind)
      throw new StudioError(409, "This generation request belongs to another draft or function.");
    return { ...current, job: previousJob };
  }

  function configureLocalState(source: StudioState) {
    const next = structuredClone(source);
    const defaults = next.settings.defaultConnections ??= {};
    if (defaults.text) {
      defaults.ideas ??= defaults.text;
      defaults.review ??= defaults.text;
    }
    next.settings.qualifiedRates = localRates(source);
    next.settings.requestCap ||= next.settings.monthlyCap;
    for (const connection of next.connections) {
      if (!textFunctions.safeParse(connection.function).success) continue;
      connection.supportedFunctions = [...textFunctions.options];
      const allowance = connection as Connection & { maxRequestCost?: number };
      allowance.maxRequestCost ||= next.settings.monthlyCap;
    }
    return next;
  }
  function restoreLocalConfiguration(next: StudioState) {
    next.settings.defaultConnections = state.settings.defaultConnections;
    next.settings.qualifiedRates = state.settings.qualifiedRates;
    next.settings.requestCap = state.settings.requestCap;
    next.connections = state.connections;
    return next;
  }
  function enqueue(inputState: StudioState, prepared: ReturnType<typeof generationInput> | ReturnType<typeof ideaJobInput>) {
    const priced = quote(inputState, prepared);
    return applyCommand(inputState, DEMO_ACTOR, {...prepared, confirmed: true}, {
      quotedCost: priced.cost, pricingSnapshot: priced.pricingSnapshot, canonicalGeneration: prepared.kind !== "ideas",
    });
  }

  let configured = configureLocalState(state);
  let prepared;
  if (parsed.type === "idea.generate") {
    if (parsed.automaticResearch) {
      const researched = await automaticIdeaResearch(configured, DEMO_ACTOR, parsed, retrieveLocalReferences, undefined, async (snapshot) => {
        const saved = withDatabase((db) => write(db, currentRevision, restoreLocalConfiguration(structuredClone(snapshot))));
        currentRevision = saved.revision;
      });
      configured = researched.state;
      prepared = ideaJobInput(configured, DEMO_ACTOR, researched.command);
    } else {
      prepared = ideaJobInput(configured, DEMO_ACTOR, parsed);
    }
  } else {
    const draft = configured.contents.find((item) => item.id === parsed.contentId);
    const policy = configured.settings.reviewPolicy;
    if (draft && policy && !preparationFor(configured, draft, DEMO_ACTOR.email, new Date().toISOString())) {
      configured = applyCommand(configured, DEMO_ACTOR, {
        type: "preparation.authorize", contentId: draft.id, expectedRevision: parsed.expectedRevision, maxCents: policy.packageCap,
      });
    }
    prepared = generationInput(configured, DEMO_ACTOR, parsed);
    const query = typeof publicQuery === "string" ? publicQuery.trim() : "";
    const hasLinks = Array.isArray(publicSourceUrls) && publicSourceUrls.length > 0;
    if (draft && parsed.kind === "text" && (query || hasLinks)) {
      // Check the monthly budget before spending time on public retrieval.
      enqueue(configured, prepared);
      const input = commandSchema.parse({
        type: "research.retrieve",
        channel: draft.channel,
        contentId: draft.id,
        expectedRevision: parsed.expectedRevision,
        query: query || draft.title,
        sourceUrls: publicSourceUrls,
        idempotencyKey: `writing-research:${parsed.idempotencyKey}`,
      });
      if (input.type !== "research.retrieve") throw new StudioError(400, "Invalid research request.");
      const researched = await retrieve(input);
      if (researched !== state) {
        const saved = withDatabase((db) => write(db, currentRevision, researched));
        currentRevision = saved.revision;
      }
      const evidence = researched.jobs.find((j) => j.idempotencyKey === input.idempotencyKey);
      if (evidence?.result && JSON.parse(evidence.result).citations?.length) {
        configured.jobs = researched.jobs;
        configured.version = Math.max(configured.version, researched.version);
        prepared = generationInput(configured, DEMO_ACTOR, {
          ...parsed, researchJobIds: [...new Set([evidence.id, ...prepared.researchJobIds])].slice(0, 5),
        });
      } else {
        configured.jobs = researched.jobs;
        configured.version = Math.max(configured.version, researched.version);
      }
    }
  }
  const connection = configured.connections.find((c) => c.id === prepared.connectionId);
  if (!connection) throw new StudioError(409, "Select a validated model in AI Connections.");
  const key = withDatabase((db) => storedKey(db, connection.id));
  const next = restoreLocalConfiguration(enqueue(configured, prepared));
  const job = next.jobs.find((j) => j.idempotencyKey === prepared.idempotencyKey)!;
  job.state = "running";
  job.attempt = 1;
  job.leaseId = crypto.randomUUID();
  job.dispatchStartedAt = new Date().toISOString();
  withDatabase((db) => write(db, currentRevision, next));

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
    const now = new Date().toISOString();
    const settled = applyWorkerReceipt(latest.state, {
      version: 1, jobId: job.id, leaseId: job.leaseId!, receivedAt: now,
      ...(problem
        ? { problem: { ambiguous: problem.ambiguous, message: problem.message } }
        : { outcome: {
            text: output?.text?.slice(0, 200000),
            completion: output?.completion,
            stopReason: output?.stopReason,
            usage: output?.usage,
          } }),
    });
    const finished = settled.jobs.find((j) => j.id === job.id)!;
    if (output?.standardUsage) settleUsageCost(finished, output.standardUsage, true);
    return { ...write(db, latest.revision, settled), job: finished };
  }));
}
