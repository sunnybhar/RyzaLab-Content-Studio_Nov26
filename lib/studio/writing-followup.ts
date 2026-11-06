import type {Job,StudioState} from "./types";
import {StudioError} from "./permissions";
/** An explicit follow-up changes editorial blocking only, never billing/outcome evidence. */
export function hasWritingFollowup(state:StudioState,job:Job){
 const successor=state.jobs.find(next=>next.id===job.writingFollowupId);
 return Boolean(job.state==="unknown"&&job.kind==="text"&&successor?.kind==="text"&&successor.contentId===job.contentId&&successor.uncertainPredecessorIds?.includes(job.id)&&!["cancelled","blocked","failed"].includes(successor.state));
}
export function blockingUnknownJobs(state:StudioState,contentId:string){return state.jobs.filter(job=>job.contentId===contentId&&job.state==="unknown"&&!hasWritingFollowup(state,job));}
export function validateWritingFollowup(state:StudioState,contentId:string,ids:string[]|undefined){
 if(!ids?.length)return;
 const pending=blockingUnknownJobs(state,contentId);
 if(!pending.length||new Set(ids).size!==ids.length||pending.length!==ids.length||pending.some(job=>job.kind!=="text"||!ids.includes(job.id)))throw new StudioError(409,"The uncertain writing requests changed. Refresh before authorizing a new attempt. Original reservations remain retained.");
 if(state.jobs.some(job=>job.contentId===contentId&&["queued","running","awaiting_confirmation"].includes(job.state)))throw new StudioError(409,"Another request is still active. Wait for its outcome before authorizing a new writing attempt.");
}
