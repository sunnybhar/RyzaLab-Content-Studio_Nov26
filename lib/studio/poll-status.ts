import type {Actor,StudioState,Job} from "./types";
import {requirePermission} from "./permissions";
import {StudioError} from "./permissions";
export async function workerPollStatus(db:{rpc:(name:string,args:Record<string,unknown>)=>any},kind:"worker"|"maintenance"|"notifications",lease=crypto.randomUUID()){
 const {data,error}=await db.rpc("studio_poll_status",{p_kind:kind,p_lease:lease,p_docs_enabled:kind==="maintenance"&&Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)});
 if(error)throw compactStatusError(error,"Low-bandwidth worker status");
 if(!data||typeof data.due!=="boolean"||!Number.isSafeInteger(data.version))throw new StudioError(503,"Worker status response is invalid.");
 return{due:data.due as boolean,version:data.version as number,lease};
}
export async function finishMaintenancePoll(db:{rpc:(name:string,args:Record<string,unknown>)=>any},lease:string,version:number){
 const {error}=await db.rpc("studio_finish_maintenance_poll",{p_lease:lease,p_version:version});
 if(error)throw new StudioError(503,"Maintenance checkpoint could not be saved. No provider request was repeated.");
}

export async function compactJobStatus(db:{rpc:(name:string,args:Record<string,unknown>)=>any},actor:Actor,jobId:string){
 const {data,error}=await db.rpc("studio_job_status",{p_job_id:jobId,p_actor_email:actor.email});
 if(error)throw compactStatusError(error,"Compact job status");
 if(!data||data.job?.id!==jobId||data.job?.createdBy!==actor.email||data.member?.email!==actor.email)throw new StudioError(404,"Your authorized content job was not found.");
 requirePermission({members:[data.member]} as StudioState,actor,"job.create",{channel:data.job.channel,function:data.job.kind,contentId:data.job.contentId??undefined,account:data.job.account??undefined,assignedTo:data.assignedTo??undefined});
 return data.job as Job;
}

function compactStatusError(error:{code?:string;message?:string},operation:string){
 const missing=["42883","PGRST202"].includes(error.code||"");
 if(error.code==="42501")return new StudioError(403,`${operation} access was denied. Check current membership and service-role permissions; this does not establish that SQL is missing.`);
 if(missing)return new StudioError(503,`${operation} is unavailable. Apply the current 20261108_studio_egress_control.sql. The worker will not download the workspace to poll for work.`);
 if(error.code==="57014"||/timeout|timed out/i.test(error.message||""))return new StudioError(503,`${operation} timed out. No full-workspace fallback or provider retry was made; a timeout does not establish that SQL is missing.`);
 return new StudioError(503,`${operation} is temporarily unavailable. Check Supabase availability, quota restrictions and server diagnostics. No full-workspace fallback or provider retry was made.`);
}
export async function compactVerificationStatus(db:{rpc:(name:string,args:Record<string,unknown>)=>any},actor:Actor,runId:string){
 const {data,error}=await db.rpc("studio_verification_status",{p_run_id:runId,p_actor_email:actor.email});
 if(error)throw compactStatusError(error,"Compact verification status");
 if(!data||data.runId!==runId||data.member?.email!==actor.email)throw new StudioError(404,"Your verification sample was not found.");
 requirePermission({members:[data.member]} as StudioState,actor,"settings.manage");
 if(!Number.isSafeInteger(data.version)||typeof data.waiting!=="boolean")throw new StudioError(503,"Verification status response is invalid.");
 return {version:data.version as number,waiting:data.waiting as boolean};
}
