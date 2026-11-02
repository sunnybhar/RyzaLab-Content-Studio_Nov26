import type {Job} from './types';
import {rateSchema} from './pricing';
export interface ClaudeUsage {inputTokens:number;outputTokens:number;cacheReadTokens:number;cacheCreationTokens:number}
export function claudeUsage(raw:unknown):ClaudeUsage|undefined {
 if(!raw||typeof raw!=='object')return;
 const r=raw as Record<string,unknown>;
 const values=[r.input_tokens,r.output_tokens,r.cache_read_input_tokens??0,r.cache_creation_input_tokens??0];
 if(!values.every(n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=10000000))return;
 return {inputTokens:values[0] as number,outputTokens:values[1] as number,cacheReadTokens:values[2] as number,cacheCreationTokens:values[3] as number};
}
/** Usage-priced token cost, rounded up to cents. Never described as an invoice. */
export function usageCost(job:Job,usage:ClaudeUsage) {
 const parsed=rateSchema.safeParse(job.pricingSnapshot);
 // Pricing snapshots include quote metadata; extract the card fields explicitly.
 const snapshot=job.pricingSnapshot as Record<string,unknown>|undefined;
 const {inputBytes:_bytes,quoteVersion:_version,...card}=snapshot||{};
 const rate=parsed.success?parsed:rateSchema.safeParse(card);
 if(!rate.success||rate.data.provider!=='anthropic'||!['text','ideas','review'].includes(job.kind)||usage.cacheReadTokens||usage.cacheCreationTokens||rate.data.fixedCents!==undefined)return;
 if(usage.outputTokens>rate.data.maxOutputTokens||usage.inputTokens>rate.data.maxInputBytes)return;
 const cents=Math.ceil((usage.inputTokens*rate.data.inputCentsPerMillion+usage.outputTokens*rate.data.outputCentsPerMillion)/1000000);
 if(cents>job.reserved)return;
 return cents;
}
