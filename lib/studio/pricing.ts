import {requestedIdeaQuantity} from "./idea-generation";
import {compileSystem,renderSystem,type SystemContext} from "./system-context";
import {isLongForm,writingFormat} from "./channel-writing";
import {agentContext} from "./agent-context";
import { z } from "zod";
import { researchBudgetSchema, validResearchReservation, capabilityMatchesBudget } from "./research-budget";
import { researchConfigSchema, PUBLIC_RESEARCH_SYSTEM } from "./research";
import type { Connection, StudioState } from "./types";
import { StudioError } from "./permissions";
export const rateSchema = z
  .object({
    provider: z.enum(["anthropic", "openai", "google"]),
    model: z.string().regex(/^[A-Za-z0-9_.:/-]{1,150}$/),
    function: z.enum([
      "text",
      "ideas",
      "review",
      "research",
      "image",
      "audio",
      "video",
    ]),
    currency: z.literal("USD"),
    inputCentsPerMillion: z.number().nonnegative(),
    outputCentsPerMillion: z.number().nonnegative(),
    maxInputBytes: z.number().int().positive().max(500000),
    maxOutputTokens: z.number().int().min(1).max(6000),
    fixedCents: z.number().int().positive().optional(),
    researchBudget: researchBudgetSchema.optional(),
    webSearchTool: z.literal("web_search_20250305").optional(),
    maxSearchUses: z.literal(1).optional(),
    source: z.url(),
    verifiedAt: z.string().min(10),
    qualified: z.literal(true),
    registryVersion: z.string().optional(),
    qualifiedBy: z.string().optional(),
    qualificationEvidence: z.string().max(12000).optional(),
  })
  .strict();
export type Rate = z.infer<typeof rateSchema>;
export function readRates(raw = process.env.STUDIO_RATE_CARD): Rate[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new StudioError(
      503,
      "The server pricing registry is invalid. Paid execution is blocked.",
    );
  }
  const parsed = z.array(rateSchema).safeParse(value);
  if (!parsed.success)
    throw new StudioError(
      503,
      "The server pricing registry is invalid. Paid execution is blocked.",
    );
  return parsed.data;
}
export function effectiveRates(state: StudioState): Rate[] {
  if (state.settings.qualifiedRates === undefined) return readRates();
  const parsed = z
    .array(rateSchema)
    .max(100)
    .safeParse(state.settings.qualifiedRates);
  if (!parsed.success)
    throw new StudioError(
      503,
      "The workspace pricing registry is invalid. Paid execution is blocked.",
    );
  return parsed.data;
}
export function frozenSystem(job:SystemContext){return job.systemSnapshot??renderSystem(job);}
export function quote(
  state: StudioState,
  input: {
    channel: string;
    kind: string;
    connectionId: string;
    prompt: string;
  },
  rates = effectiveRates(state),
) {
  const connection = state.connections.find((c) => c.id === input.connectionId),
    workflow = state.workflows.find(
      (w) => w.channel === input.channel && w.status === "active",
    );
  if (!connection || !workflow)
    throw new StudioError(
      400,
      "Select a configured connection and active workflow.",
    );
  if (!connection.hasKey || connection.status !== "validated")
    throw new StudioError(
      400,
      "Validate a connected provider credential before requesting a paid quote.",
    );
  const card = rates.find(
    (r) =>
      r.provider === connection.provider &&
      r.model === connection.model &&
      r.function === input.kind,
  );
  if (!card)
    throw new StudioError(
      503,
      "No qualified provider/model pricing is registered for this function. Evaluate a sample and configure the server rate card before paid generation.",
    );
  if (
    input.kind === "research" &&
    (!researchConfigSchema.safeParse(card).success || !capabilityMatchesBudget(connection,card))
  )
    throw new StudioError(
      503,
      "Research setup needs a current model capability check and an automatically calculated reservation. Open AI & budgets → Research setup. No paid request was sent.",
    );
  const ideaQuantity=input.kind==="ideas"?requestedIdeaQuantity(input.prompt):undefined;
  if(ideaQuantity&&ideaQuantity*300>card.maxOutputTokens)throw new StudioError(400,`This idea batch needs more than the qualified ${card.maxOutputTokens.toLocaleString("en-US")} output tokens. Generate at most ${Math.floor(card.maxOutputTokens/300)} ideas per request with this connection, or qualify a larger output allowance. No AI request was sent.`);
  if(input.kind==="text"&&isLongForm(workflow.channel,writingFormat(input.prompt))&&card.maxOutputTokens<4096)throw new StudioError(409,"Long-form writing needs at least 4,096 qualified output tokens. Open AI & budgets → Bounded research and writing, then check model and save setup again. No paid request was sent.");
  const referenceSnapshots = state.references.filter((r) =>
    workflow.references.includes(r.id),
  );
  const system = input.kind === "research" ? PUBLIC_RESEARCH_SYSTEM : compileSystem({
    kind: input.kind,
    prompt: input.prompt,
    rulesSnapshot: state.settings.protectedRules,
    workflowSnapshot: workflow,
    referenceSnapshots,
    agentContextSnapshot: ["ideas","text","review"].includes(input.kind)?agentContext(state,workflow.channel,input.prompt):undefined,
    outputContract:
      input.kind === "text"
        ? "draft_v1"
        : input.kind === "review"
          ? "review_v1"
          : undefined,
  },card.maxInputBytes);
  // UTF-8 bytes conservatively bound tokenized text for the qualified adapter; additional protocol allowance is reserved.
  const bytes = new TextEncoder().encode(system + input.prompt).length + 2048;
  if(input.kind==="research" && card.researchBudget && bytes>card.researchBudget.contextTokens)throw new StudioError(400,"The public query exceeds the model's guarded input limit. Shorten the query.");
  if (bytes > card.maxInputBytes)
    throw new StudioError(
      400,
      "This request exceeds the qualified input limit. Shorten the brief or selected reference set.",
    );
  const cost =
    card.fixedCents ??
    Math.max(
      1,
      Math.ceil(
        (bytes * card.inputCentsPerMillion +
          card.maxOutputTokens * card.outputCentsPerMillion) /
          1000000,
      ),
    );
  const ceiling = (connection as Connection & { maxRequestCost?: number })
    .maxRequestCost;
  if (ceiling && cost > ceiling)
    throw new StudioError(
      409,
      "The qualified estimate exceeds this connection’s request allowance. An authorized settings change is required.",
    );
  return {
    cost,
    pricingSnapshot: {
      ...card,
      inputBytes: bytes,
      quoteVersion: input.kind === "ideas" ? "ideas-v2" : input.kind === "research" ? "research-envelope-v1" : "v1",
    },
  };
}

export function pricingSnapshotIsCurrent(snapshot: unknown, rates: Rate[]) {
  if (!snapshot || typeof snapshot !== "object") return false;
  const {
    inputBytes: _inputBytes,
    quoteVersion: _quoteVersion,
    ...frozen
  } = snapshot as Record<string, unknown>;
  const parsed = rateSchema.safeParse(frozen);
  if (!parsed.success) return false;
  if (parsed.data.function === "ideas" && _quoteVersion !== "ideas-v2")
    return false;
  if(parsed.data.function === "research" && (_quoteVersion!=="research-envelope-v1" || !validResearchReservation(parsed.data)))return false;
  return rates.some(
    (current) => JSON.stringify(current) === JSON.stringify(parsed.data),
  );
}
