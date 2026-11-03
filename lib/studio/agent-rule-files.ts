import {z} from "zod";
import type {Actor,Channel,StudioState} from './types';
import {requirePermission,StudioError} from './permissions';
export const storedAgentFileSchema=z.object({fileName:z.string().min(1).max(200).regex(/\.(docx|pdf|md|txt)$/i).refine(value=>!/[\\/\x00-\x1f]/.test(value)),base64:z.string().min(4).max(349528).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),byteSize:z.number().int().min(1).max(262144)}).strict();
export type StoredAgentFile=z.infer<typeof storedAgentFileSchema>;
export function validateStoredAgentFile(file:StoredAgentFile){let bytes=0;try{bytes=atob(file.base64).length;}catch{throw new StudioError(400,"Invalid file encoding.");}if(bytes!==file.byteSize||bytes<1||bytes>262144)throw new StudioError(400,"Choose a nonempty file up to 256 KB.");return bytes;}
export interface AgentRuleFile {id:string;channel:Channel;slot:'instructions'|'context';fileName:string;base64:string;byteSize:number;uploadedBy:string;uploadedAt:string;}
/** Storage-only configuration. Never add these files to prompts or workflow refs. */
export function saveAgentRuleFile(input:StudioState,actor:Actor,change:{channel:Channel;slot:'instructions'|'context';fileName:string;base64:string;byteSize:number;expectedId?:string},now:string,id:string) {
 requirePermission(input,actor,'workflow.edit',{channel:change.channel});
 const previous=input.agentRuleFiles?.find(f=>f.channel===change.channel&&f.slot===change.slot);
 if(previous?.id!==change.expectedId)throw new StudioError(409,'This file changed. Refresh Agent Rules before replacing it.');
 const bytes=validateStoredAgentFile(change);
 const next=structuredClone(input);next.agentRuleFiles=(next.agentRuleFiles||[]).filter(f=>f.channel!==change.channel||f.slot!==change.slot);
 next.agentRuleFiles.push({id,channel:change.channel,slot:change.slot,fileName:change.fileName,base64:change.base64,byteSize:bytes,uploadedBy:actor.email,uploadedAt:now});next.version++;
 next.audit.push({id,actor:actor.email,action:'agentRules.fileSaved',target:`${change.channel}/${change.slot}`,at:now});return next;
}
