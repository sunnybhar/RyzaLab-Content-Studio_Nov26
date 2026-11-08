import type { Actor, Member, StudioState } from "./types";
import {memberFor,StudioError} from "./permissions";
import {studioDatabaseError} from "./database-errors";
/** Small server-only projection. Never selects drafts, prompts, archives or history. */
export async function readWorkspaceHead(db:{from:(table:string)=>any},actor:Actor){
 const {data,error}=await db.from("studio_workspace").select("version,members:state->members").eq("id",true).maybeSingle();
 if(error)throw studioDatabaseError(error,"read");if(!data)return undefined;
 if(!Number.isSafeInteger(data.version)||!Array.isArray(data.members))throw new StudioError(503,"Workspace status is unavailable.");
 memberFor({members:data.members as Member[]} as StudioState,actor);
 return {version:data.version as number};
}
