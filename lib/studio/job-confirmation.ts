import type {Actor,StudioState} from "./types";
import {applyCommand,type ExecutionContext} from "./engine";
import {can,requirePermission,StudioError} from "./permissions";
function confirmed(state:StudioState,actor:Actor,id:string){
 const job=state.jobs.find(j=>j.id===id);if(!job)throw new StudioError(404,"Job not found.");
 const content=state.contents.find(c=>c.id===job.contentId);
 requirePermission(state,actor,"job.create",{channel:job.channel,function:job.kind,contentId:job.contentId,account:job.account,assignedTo:content?.assignedTo});
 if(job.createdBy!==actor.email&&!can(state,actor,"settings.manage"))throw new StudioError(403,"This request belongs to another creator.");
 return ["queued","running","succeeded","unknown","failed"].includes(job.state);
}
/** Confirm the same saved request. Read back ambiguous saves; never dispatch or repeat a timed-out write. */
export async function commitJobConfirmation(original:StudioState,actor:Actor,id:string,io:{load:()=>Promise<StudioState>;commit:(before:StudioState,after:StudioState)=>Promise<void>},ctx:ExecutionContext={}){
 let before=original;
 for(let attempt=0;attempt<2;attempt++){
  if(confirmed(before,actor,id))return before;
  const next=applyCommand(before,actor,{type:"job.confirm",id},ctx);
  try{await io.commit(before,next);return next;}catch(error){
   if(!(error instanceof StudioError)||![409,503,504].includes(error.code))throw error;
   let fresh:StudioState;try{fresh=await io.load();}catch{throw new StudioError(503,"Approval save outcome is not yet confirmed. Check this existing request before approving again; no new AI request was made.");}
   if(confirmed(fresh,actor,id))return fresh;
   if(error.code===409&&attempt===0&&fresh.jobs.find(j=>j.id===id)?.state==="awaiting_confirmation"){before=fresh;continue;}
   throw error;
  }
 }
 throw new StudioError(409,"Check this existing approval request before continuing.");
}
