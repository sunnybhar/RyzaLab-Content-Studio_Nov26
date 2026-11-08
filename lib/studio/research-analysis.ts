import { eligibleEvidence } from "./source-policy";
import { researchEvidence } from "./research-link";
import { researchMethodology } from "./research-methodology";
import { resolvedConnection } from "./solo-quality";
import { requirePermission, StudioError } from "./permissions";
import { quote } from "./pricing";
import type { Actor, Channel, StudioState } from "./types";
import type { DossierSource } from "./research-dossier";
export function researchAnalysisInput(state:StudioState,actor:Actor,input:{channel:Channel;researchJobId:string;idempotencyKey:string;maximum:number}){
 requirePermission(state,actor,"job.create",{channel:input.channel,function:"text"});
 const source=eligibleEvidence(researchEvidence(state,actor,input.channel,[input.researchJobId]))[0];
 if(!source?.citations.length)throw new StudioError(409,"Retrieve permitted source passages before analysis.");
 const previous=state.jobs.find(j=>j.researchAnalysisSourceId===input.researchJobId&&j.createdBy===actor.email&&["queued","running","awaiting_confirmation","unknown"].includes(j.state)&&j.idempotencyKey!==input.idempotencyKey);
 if(previous)throw new StudioError(409,"An analysis is already pending or uncertain. Check that saved request; no additional paid analysis was started.");
 const connectionId=resolvedConnection(state,input.channel,"text");
 if(!connectionId)throw new StudioError(409,"Connect Writing in AI & budgets to analyze source passages.");
 const all:DossierSource[]=source.citations.map((c,index)=>({...c,id:`s${index+1}`}));
 // Every included passage is retained verbatim in the job. Bound input locally before pricing.
 let command: {type:"job.enqueue";kind:"text";channel:Channel;connectionId:string;researchJobIds:string[];prompt:string;estimate:number;confirmed:boolean;idempotencyKey:string;researchAnalysisSourceId:string}|undefined;
 let failure:unknown;
 for(const bound of [6000,3000,1600,800,400]){
  const sources=all.slice(0,15).map(s=>({...s,citedText:s.citedText.slice(0,bound)}));
  const prompt=JSON.stringify({operation:"research_dossier_v1",question:state.jobs.find(j=>j.id===input.researchJobId)!.prompt,sources,methodology:researchMethodology(state,input.channel),coverage:{available:all.length,included:sources.length,passages:"Only the supplied passage text was available for this analysis; never claim full-source access."}});
  const candidate={type:"job.enqueue" as const,kind:"text" as const,channel:input.channel,connectionId,researchJobIds:[input.researchJobId],prompt,estimate:input.maximum,confirmed:true,idempotencyKey:input.idempotencyKey,researchAnalysisSourceId:input.researchJobId};
  try{const priced=quote(state,candidate);if(priced.cost>input.maximum)throw new StudioError(409,"The analysis quote exceeds the maximum you confirmed. Refresh its allowance before starting.");command=candidate;break;}catch(e){failure=e;if(e instanceof StudioError&&e.code!==400)throw e;}
 }
 if(!command)throw failure;
 return command;
}
