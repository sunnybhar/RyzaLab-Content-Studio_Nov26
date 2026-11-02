"use client";
import {useEffect,useRef,useState} from 'react';import type {Actor,StudioState} from '@/lib/studio/types';
/** Only advances jobs already explicitly authorized and queued by this user. */
export function AuthorizedJobProgress({state,actor,demo,request,refresh}:{state:StudioState;actor:Actor;demo:boolean;request:(jobId:string)=>Promise<unknown>;refresh:()=>Promise<void>}){
 const sampleIds=new Set(state.verificationRuns?.flatMap(r=>r.cases.flatMap(c=>[c.ideaJobId,c.writingJobId])));
 const job=state.jobs.find(j=>j.createdBy===actor.email&&j.state==='queued'&&['text','ideas','review'].includes(j.kind)&&!sampleIds.has(j.id));
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);const attempted=useRef(new Set<string>()),requestRef=useRef(request),refreshRef=useRef(refresh);requestRef.current=request;refreshRef.current=refresh;
 useEffect(()=>{if(demo||!job||attempted.current.has(job.id))return;attempted.current.add(job.id);let live=true;setBusy(true);setError('');void requestRef.current(job.id).catch(async(e)=>{if(live)setError(e instanceof Error?e.message:'Authorized job needs attention.');await refreshRef.current().catch(()=>{});}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[job?.id,demo,retry]);
 if(demo||!job)return null;return <div className="s-panel s-panel-padding" role="status">{busy?`Processing your authorized ${job.kind} request…`:error||`Your ${job.kind} request is queued.`}{error&&<button className="s-btn" onClick={()=>{attempted.current.delete(job.id);setRetry(n=>n+1);}}>Check queued request again</button>}</div>;
}
