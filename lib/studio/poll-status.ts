import {StudioError} from "./permissions";
export async function workerPollStatus(db:{rpc:(name:string,args:Record<string,unknown>)=>any},kind:"worker"|"maintenance"|"notifications",lease=crypto.randomUUID()){
 const {data,error}=await db.rpc("studio_poll_status",{p_kind:kind,p_lease:lease,p_docs_enabled:kind==="maintenance"&&Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)});
 if(error)throw new StudioError(503,"Low-bandwidth worker status is unavailable. Apply 20261108_studio_egress_control.sql; the worker will not download the workspace to poll for work.");
 if(!data||typeof data.due!=="boolean"||!Number.isSafeInteger(data.version))throw new StudioError(503,"Worker status response is invalid.");
 return{due:data.due as boolean,version:data.version as number,lease};
}
export async function finishMaintenancePoll(db:{rpc:(name:string,args:Record<string,unknown>)=>any},lease:string,version:number){
 const {error}=await db.rpc("studio_finish_maintenance_poll",{p_lease:lease,p_version:version});
 if(error)throw new StudioError(503,"Maintenance checkpoint could not be saved. No provider request was repeated.");
}
