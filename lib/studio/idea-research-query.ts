import {publicResearchSchema} from './research';import {StudioError} from './permissions';
const filler=new Set('a an the any idea ideas topic topics post posts content generate create provide suggest suggestions manual with to for of in on and or about from please me my our your this that these those ryzalab services service selected channel audience general people readers users households'.split(' '));
const words=(value:string)=>value.replace(/\bwith respect to\b/gi,' ').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!filler.has(w));
const elder=/\belder\s*care\b|\belderly\b|\bseniors?\b|\bolder adults?\b|\bgeriatr/i;
const elderEvidence=/\belder(?:ly|s)?\b|\bseniors?\b|\bolder (?:adults?|people|persons?)\b|\bgeriatr\w*\b|\bageing\b|\baging\b/i;
export function ideaResearchQuery(topic:string,audience:string) {
 const tokens=[...new Set([...words(topic),...words(audience)])].slice(0,12);
 const elderAudience=elder.test(audience);const filtered=elderAudience?tokens.filter(w=>!['elder','care','eldercare','elderly','senior','seniors','older','adults'].includes(w)):tokens;
 const query=[...filtered,...(elderAudience?['elder care']:[])].join(' ');
 if(query.length<5||new TextEncoder().encode(query).length>2000)throw new StudioError(400,'Enter a specific public subject or audience, such as elder care or home automation. A brand-only request does not describe a research topic.');
 return query;
}
export function relevantIdeaCitation(cite:{title:string;citedText:string},topic:string,audience:string) {
 const text=`${cite.title} ${cite.citedText}`.toLowerCase();
 if(elder.test(audience)&&!elderEvidence.test(text))return false;
 const anchors=words(topic).filter(w=>!['write','writing','make','new','better','some','looking','need'].includes(w));
 // This is a lexical relevance screen, not factual verification.
 return !anchors.length||anchors.some(w=>w==='handoff'?/handoff|handover|documentation|instructions/.test(text):text.includes(w.replace(/(?:ing|tion|s)$/, '')));
}
export function screenIdeaResearch(raw:unknown,topic:string,audience:string) {
 const result=publicResearchSchema.parse(raw),citations=result.citations.filter(c=>relevantIdeaCitation(c,topic,audience)),removed=result.citations.length-citations.length;
 if(!citations.length)throw new StudioError(422,'The retrieved references did not match this topic and audience. No paid idea request was started. Use a more specific public topic; unrelated sources will not be used as research.');
 return publicResearchSchema.parse({...result,citations,summary:`Retrieved ${citations.length} topic/audience-matched excerpts. Relevance screening does not verify factual claims.`,retrieval:{...result.retrieval,excerptBytes:new TextEncoder().encode(citations.map(c=>c.citedText).join('\n')).length,gaps:[...result.retrieval.gaps,...(removed?[`${removed} unrelated reference(s) excluded by the topic/audience relevance screen.`]:[])].slice(0,4)}});
}
