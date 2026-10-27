export const CHANNELS=['LinkedIn','Instagram','TikTok','Facebook','YouTube','Reddit','Notes','Newsletter','Hub'] as const;
export type Channel=typeof CHANNELS[number];
export const ROLES=['founder','administrator','manager','editor','creator','viewer'] as const;
export type Role=typeof ROLES[number];
export const FUNCTIONS=['research','ideas','text','review','image','video','audio'] as const;
export type FunctionKind=typeof FUNCTIONS[number];
export interface Grant { action:string; function?:FunctionKind; channel?:Channel; contentId?:string; account?:string }
export interface Member { id:string; email:string; roles:Role[]; grants:Grant[]; revoked:boolean }
export interface Actor { id:string; email:string }
export interface Reference { id:string; title:string; content:string; channel:Channel|'Shared'; kind:'brand'|'source'|'example'; createdAt:string }
export interface Workflow { id:string; channel:Channel; version:number; status:'draft'|'review'|'active'; title:string; audience:string; instructions:string; guardrails:string; references:string[]; examples:string; outputFormat:string; checks:string; connectionId:string; createdBy:string; createdAt:string }
export interface Idea { id:string; title:string; brief:string; channel:Channel; state:'pending'|'approved'|'rejected'; rejection?:string; sourceId?:string; createdBy:string; createdAt:string; sources:string[] }
export interface Slide { id:string; title:string; body:string; image?:string; color:string; background:string; x:number; y:number; fontSize:number }
export interface Scene { id:string; title:string; script:string; duration:number; sourceUrl?:string; audioUrl?:string; preserveAudio:boolean }
export interface MediaProject { slides:Slide[]; scenes:Scene[]; imagePrompt:string; imageUrl?:string; narration:string; captions:string; aspect:'9:16'|'16:9'|'1:1'; templateId?:string }
export interface Revision { id:string; text:string; title:string; metadata:string; media:MediaProject; createdBy:string; createdAt:string; reason:string }
export interface Content { id:string; channel:Channel; account:string; title:string; format:string; text:string; metadata:string; media:MediaProject; ideaId?:string; assignedTo:string; revision:number; textRevision?:number; mediaRevision?:number; history:Revision[]; state:'draft'|'review'|'changes'; workflowId?:string; docId?:string; docsBase?:string; docsFetchedAt?:string; createdBy:string; updatedAt:string; deletedAt?:string; collection?:string }
export interface Package { id:string; contentId:string; channel:Channel; account:string; title:string; revision:number; textRevision?:number; mediaRevision?:number; textId?:string; mediaId?:string; text:string; metadata:string; media:MediaProject; workflowId?:string; ruleVersion:string; approvedBy:string; approvedAt:string; hash:string }
export interface Schedule { id:string; contentId:string; packageId?:string; at:string; groupId?:string; owner:string; state:'planned'|'blocked'|'published'; publicationUrl?:string; confirmedBy?:string; confirmedAt?:string; verification?:'human_confirmed' }
export interface Connection { id:string; title:string; provider:'anthropic'|'openai'|'google'; function:FunctionKind; model:string; hasKey:boolean; status:'unverified'|'validated'; updatedAt:string }
export interface Job { id:string; kind:FunctionKind; channel:Channel; contentId?:string; prompt:string; connectionId:string; estimate:number; reserved:number; actual?:number; state:'awaiting_confirmation'|'queued'|'running'|'succeeded'|'failed'|'unknown'|'cancelled'; attempt:number; idempotencyKey:string; createdBy:string; createdAt:string; result?:string; error?:string; mediaRevision?:number; account?:string; workflowId?:string; workflowSnapshot?:Workflow; rulesSnapshot?:string; period?:string; payloadHash?:string; leaseId?:string; leaseUntil?:string; dispatchStartedAt?:string }
export interface Notice { id:string; user:string; title:string; body:string; read:boolean; createdAt:string; emailState:'not_configured'|'pending'|'sent'|'failed'; eventId:string }
export interface Audit { id:string; actor:string; action:string; target:string; at:string }
export interface Template { id:string; title:string; channel:Channel; slides:Slide[]; status:'pending'|'approved'; createdBy:string }
export interface Recurrence { id:string; title:string; channel:Channel; quantity:number; nextAt:string; research:boolean; state:'active'|'paused'; lastOccurrence?:string }
export interface Settings { timezone:string; trashDays:number; monthlyCap:number; requestCap:number; confirmationThreshold:number; currency:string; functionCaps:Partial<Record<FunctionKind,number>>; userCaps:Record<string,number>; channelCaps?:Partial<Record<Channel,number>>; accountCaps?:Record<string,number>; protectedRules:string; protectedVersion:string; emailEnabled:boolean; docsMode:'manual'|'automatic' }
export interface StudioState { version:number; members:Member[]; references:Reference[]; workflows:Workflow[]; ideas:Idea[]; contents:Content[]; packages:Package[]; schedules:Schedule[]; connections:Connection[]; jobs:Job[]; notices:Notice[]; audit:Audit[]; templates:Template[]; recurrences:Recurrence[]; settings:Settings }
export interface Command { type:string; [key:string]:unknown }
export interface StudioResponse { state:StudioState; actor:Actor; mode:'demo'|'live' }
