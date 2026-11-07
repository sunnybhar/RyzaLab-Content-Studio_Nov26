import {z} from "zod";
import type {Content,MediaProject} from "./types";
import {mediaSchema,commandSchema} from "./commands";
export interface DraftValues {title:string;text:string;metadata:string;collection:string;media:MediaProject}
export const valuesOf=(c:Content):DraftValues=>({title:c.title,text:c.text,metadata:c.metadata,collection:c.collection||"",media:c.media});
export function equalDraft(a:DraftValues,b:DraftValues){const stable=(v:DraftValues)=>JSON.stringify(v,(_key,value)=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);return stable(a)===stable(b);}
const valuesSchema=z.object({title:z.string().max(200),text:z.string().max(60000),metadata:z.string().max(60000),collection:z.string().max(100),media:mediaSchema}).strict();
const recoverySchema=z.object({v:z.literal(1),at:z.number(),baseRevision:z.number().int().positive(),base:valuesSchema,values:valuesSchema,pending:commandSchema.transform(c=>{if(c.type!=="content.save"||!c.operationId)throw Error("Invalid recovery save operation");return c;}).optional()}).strict();
export type DraftRecovery=z.infer<typeof recoverySchema>;
export const RECOVERY_PREFIX="ryza-draft-recovery-v1:";
export function recoveryKey(mode:string,workspace:string,actor:string,contentId:string){return RECOVERY_PREFIX+JSON.stringify([mode,workspace,actor,contentId]);}
export function readRecovery(storage:Pick<Storage,"getItem"|"removeItem">,key:string,now=Date.now()):DraftRecovery|undefined{
 const raw=storage.getItem(key);if(!raw)return;
 try{const result=recoverySchema.parse(JSON.parse(raw));if(result.at>now+60000||now-result.at>72*3600000)throw Error("Expired");return result;}catch{storage.removeItem(key);return;}
}
export function clearRecovery(storage:Storage,actorId?:string){for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(!key?.startsWith(RECOVERY_PREFIX))continue;try{const scope=JSON.parse(key.slice(RECOVERY_PREFIX.length));if(!actorId||scope[2]===actorId)storage.removeItem(key);}catch{storage.removeItem(key);}}}
