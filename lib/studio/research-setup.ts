import type { Actor, Connection, StudioState } from "./types";
import { StudioError, requirePermission } from "./permissions";
import { RESEARCH_PRICE, researchReservation } from "./research-budget";
import { updateRates } from "./rate-management";
import { effectiveRates } from "./pricing";

export function researchSetupPlan(state:StudioState,connection:Connection,capability:{model:string;webSearchSupported:true;maxInputTokens:number;maxOutputTokens:number},outputTokens:number,packageCap:number) {
  if(connection.provider!=="anthropic"||connection.function!=="research"||connection.model!==capability.model||connection.model!==RESEARCH_PRICE.model)throw new StudioError(409,"Automatic pricing is available for Claude Sonnet 5.5 using your provided pricing documentation. Other models need their own documented rates.");
  if(!Number.isInteger(packageCap)||packageCap<50||packageCap>200)throw new StudioError(400,"Choose a per-post cap from $0.50 to $2.00.");
  if(!Number.isInteger(outputTokens)||outputTokens<128||outputTokens>1024||outputTokens>capability.maxOutputTokens)throw new StudioError(400,"Choose 128–1024 output tokens within the model limit.");
  const reservation=researchReservation(capability.maxInputTokens,outputTokens);
  return {...reservation,model:connection.model,packageCap,fitsPackage:reservation.cents<=packageCap,fitsRequest:reservation.cents<=state.settings.requestCap,fitsMonthly:reservation.cents<=state.settings.monthlyCap,monthlyCap:state.settings.monthlyCap,requestCap:state.settings.requestCap,price:RESEARCH_PRICE,
    explanation:"Server search has no retrieved-input limit. This guarded envelope reserves the full context on every possible model continuation allowed by the total output-token budget, plus one search. It is a worst-case planning bound, not an expected bill. Studio never resumes pause_turn automatically."};
}

export function saveResearchSetup(state:StudioState,actor:Actor,input:{connectionId:string;expectedUpdatedAt:string;expectedVersion:number;expectedPricingVersion:number;outputTokens:number;packageCap:number},capability:{model:string;webSearchSupported:true;maxInputTokens:number;maxOutputTokens:number},now:string,version:string) {
  if(state.version!==input.expectedVersion)throw new StudioError(409,"Workspace changed. Check research setup again.");
  const connection=state.connections.find(c=>c.id===input.connectionId);
  if(!connection||connection.updatedAt!==input.expectedUpdatedAt||connection.status==="disconnected"||!connection.hasKey)throw new StudioError(409,"Research connection changed. Check it again.");
  requirePermission(state,actor,"settings.manage");requirePermission(state,actor,"connections.manage",{function:"research"});
  const plan=researchSetupPlan(state,connection,capability,input.outputTokens,input.packageCap);
  if(!plan.fitsPackage||!plan.fitsRequest||!plan.fitsMonthly)throw new StudioError(409,"The calculated research reservation exceeds the selected package or existing workspace limits. No price, budget or provider request was changed.");
  if(state.settings.reviewPolicy?.packageCap!==input.packageCap)throw new StudioError(409,"Save your chosen package cap in Review and preparation first. Research setup does not change policy or monthly limits.");
  if(state.jobs.some(j=>j.connectionId===connection.id&&["queued","running","unknown","awaiting_confirmation"].includes(j.state)))throw new StudioError(409,"Resolve active or uncertain research requests before changing setup.");
  const next=updateRates(state,actor,{action:"save",expectedVersion:input.expectedPricingVersion,evidence:`User-provided documentation dated ${RESEARCH_PRICE.verifiedAt}: ${RESEARCH_PRICE.tokenSource}; ${RESEARCH_PRICE.searchSource}. Models API capability checked ${now}. Automatically calculated output-envelope-v1 reservation; no paid test inferred.`,card:{provider:"anthropic",model:connection.model,function:"research",currency:"USD",inputCentsPerMillion:RESEARCH_PRICE.inputCentsPerMillion,outputCentsPerMillion:RESEARCH_PRICE.outputCentsPerMillion,maxInputBytes:Math.min(16384,capability.maxInputTokens),maxOutputTokens:input.outputTokens,fixedCents:plan.cents,webSearchTool:"web_search_20250305",maxSearchUses:1,source:RESEARCH_PRICE.searchSource,verifiedAt:RESEARCH_PRICE.verifiedAt,qualified:true,researchBudget:{version:"output-envelope-v1",pricePreset:RESEARCH_PRICE.id,contextTokens:capability.maxInputTokens,modelMaxOutputTokens:capability.maxOutputTokens}}},effectiveRates(state),now,version);
  Object.assign(next.connections.find(c=>c.id===connection.id)!,{status:"validated",updatedAt:now,maxRequestCost:Math.max((connection as Connection&{maxRequestCost?:number}).maxRequestCost||0,plan.cents),researchCapability:{...capability,checkedAt:now,connectionUpdatedAt:now}});
  return next;
}
