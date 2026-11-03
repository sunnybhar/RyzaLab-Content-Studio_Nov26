import type {Actor,StudioState} from '@/lib/studio/types';
import {researchEvidence} from '@/lib/studio/research-link';
export function IdeaEvidence({state,actor,channel,ids}:{state:StudioState;actor:Actor;channel:import('@/lib/studio/types').Channel;ids?:string[]}) {
 if(!ids?.length)return null;let evidence;try{evidence=researchEvidence(state,actor,channel,ids);}catch{return <p role="status">Research is unavailable or needs source review.</p>;}
 return <section aria-label="Research and websites"><h3>Research and websites</h3>{evidence.map(item=><div key={item.jobId}><p>{item.version===2?`Retrieved ${item.citations.length} source excerpts for this topic. Review the original material before relying on the AI interpretation.`:item.summary}</p>{item.citations.map((cite,i)=><article key={i} className="s-version"><a href={cite.url} target="_blank" rel="noopener noreferrer">{cite.title||cite.url}</a><p>{new URL(cite.url).hostname}{cite.publishedAt?` · Published ${cite.publishedAt}`:''}</p><p>{cite.citedText}</p></article>)}{item.version===2&&item.retrieval.gaps.map(gap=><p role="status" key={gap}>{gap}</p>)}<p>{item.notice}</p></div>)}</section>;
}
