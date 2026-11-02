import { z } from "zod";

export const RESEARCH_PRICE = {
  model: "claude-sonnet-5-5", inputCentsPerMillion: 200, outputCentsPerMillion: 1000,
  searchCents: 1, verifiedAt: "2026-10-30", id: "sonnet-5-5-docs-2026-10-30",
  tokenSource: "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
  searchSource: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool",
} as const;

export const researchCapabilitySchema = z.object({
  model:z.string().min(1).max(150), webSearchSupported:z.literal(true),
  maxInputTokens:z.number().int().positive().max(10000000),
  maxOutputTokens:z.number().int().positive().max(1000000),
  checkedAt:z.iso.datetime(), connectionUpdatedAt:z.string().min(1),
}).strict();

export const researchBudgetSchema = z.object({
  version:z.literal("output-envelope-v1"), pricePreset:z.literal(RESEARCH_PRICE.id),
  contextTokens:z.number().int().positive().max(10000000),
  modelMaxOutputTokens:z.number().int().positive().max(1000000),
}).strict();

/** Basic server search has no retrieved-input cap. Reserve for every possible
 * model continuation, not just two happy-path passes: each continuation must
 * consume at least one of max_tokens' aggregate output tokens to invoke a tool.
 * No automatic pause_turn continuation, dynamic filtering or prompt caching is used.
 * This deliberately loose envelope is NOT an expected bill or provider dollar cap.
 */
export function researchReservation(contextTokens:number, outputTokens:number) {
  if(!Number.isSafeInteger(contextTokens)||contextTokens<1||contextTokens>10000000||!Number.isSafeInteger(outputTokens)||outputTokens<1||outputTokens>6000) throw new Error("Invalid research token bounds.");
  const passes=outputTokens+1;
  const scaled=BigInt(contextTokens)*BigInt(passes)*BigInt(RESEARCH_PRICE.inputCentsPerMillion)+BigInt(outputTokens)*BigInt(RESEARCH_PRICE.outputCentsPerMillion);
  const tokenCents=Number((scaled+999999n)/1000000n);
  return {cents:tokenCents+RESEARCH_PRICE.searchCents,modelPasses:passes,contextTokens,outputTokens,searches:1};
}

export function validResearchReservation(card:unknown) {
  const r=card as Record<string,unknown> | null;
  if(!r||r.provider!=="anthropic"||r.model!==RESEARCH_PRICE.model||r.function!=="research"||r.webSearchTool!=="web_search_20250305"||r.maxSearchUses!==1||r.inputCentsPerMillion!==RESEARCH_PRICE.inputCentsPerMillion||r.outputCentsPerMillion!==RESEARCH_PRICE.outputCentsPerMillion)return false;
  const budget=researchBudgetSchema.safeParse(r.researchBudget);
  if(!budget.success || typeof r.maxOutputTokens!=="number" || r.maxOutputTokens>budget.data.modelMaxOutputTokens)return false;
  try{return r.fixedCents===researchReservation(budget.data.contextTokens,r.maxOutputTokens).cents;}catch{return false;}
}

export function capabilityMatchesBudget(connection:{model:string;updatedAt?:string;researchCapability?:unknown},card:unknown) {
  if(!validResearchReservation(card))return false;
  const capability=researchCapabilitySchema.safeParse(connection.researchCapability);
  const budget=researchBudgetSchema.parse((card as Record<string,unknown>).researchBudget);
  return capability.success && capability.data.model===connection.model && capability.data.connectionUpdatedAt===connection.updatedAt && capability.data.maxInputTokens===budget.contextTokens && capability.data.maxOutputTokens>=Number((card as Record<string,unknown>).maxOutputTokens);
}
