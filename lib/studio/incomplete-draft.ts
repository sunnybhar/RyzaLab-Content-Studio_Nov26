import type {Content,Job} from './types';import {factsSignature} from './stages';
export const INCOMPLETE_DRAFT_MARKER='[INCOMPLETE OUTPUT — review and finish this recovered working draft before submitting.]';
/** Decode only a first top-level body JSON string. Never eval or complete content.
 * An incomplete final escape is omitted; all recovered text remains blocked. */
export function incompleteDraftBody(raw:string):string|undefined {
 const value=raw.trim().replace(/^\[INCOMPLETE OUTPUT[^\r\n]*\]\s*/i,'').replace(/^```(?:json)?\s*/i,'');
 const match=/^\{\s*"body"\s*:\s*"/.exec(value);if(!match)return;
 let encoded='';for(let i=match[0].length;i<value.length;i++){
  const char=value[i];if(char==='"')break;
  if(char==='\\'){
   const next=value[i+1];if(next===undefined)break;
   if(next==='u'){const hex=value.slice(i+2,i+6);if(hex.length<4)break;if(!/^[\da-f]{4}$/i.test(hex))return;encoded+=value.slice(i,i+6);i+=5;}
   else {if(!/^["\\/bfnrt]$/.test(next))return;encoded+=value.slice(i,i+2);i++;}
  }else{if(char.charCodeAt(0)<32)return;encoded+=char;}
 }
 try{const body=(JSON.parse('"'+encoded+'"') as string).replace(/[\uD800-\uDBFF]$/,'').trim();return body.length>=10?body:undefined;}catch{return;}
}
export function applyRecoveredWorkingText(content:Content,job:Job,body:string,actor:string,now:string,id:()=>string) {
 const before=factsSignature(content);content.history.push({id:id(),title:content.title,text:content.text,metadata:content.metadata,media:structuredClone(content.media),createdBy:actor,createdAt:now,reason:`Recovered incomplete response ${job.id}; prior copy retained`});
 content.text=`${INCOMPLETE_DRAFT_MARKER}\n\n${body}`;content.revision++;content.textRevision=(content.textRevision||1)+1;if(before!==factsSignature(content))content.factsRevision=(content.factsRevision||1)+1;content.researchJobIds=job.researchJobIds;content.updatedAt=now;content.state='draft';
 if(job.connectionSnapshot)content.generatedBy={provider:job.connectionSnapshot.provider,model:job.connectionSnapshot.model,jobId:job.id};
 job.appliedAt=now;job.appliedRevision=content.revision;job.outputStatus='incomplete';job.error='Available text recovered into the editor as an unfinished working draft. Finish the text and resolve the highlighted incomplete marker before submitting. No additional AI request was made.';
}
