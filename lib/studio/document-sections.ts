import{z}from'zod';
import type{MediaProject}from'./types';
export const sectionImageSchema=z.object({id:z.string().min(1).max(200),section:z.string().min(1).max(600),url:z.string().max(8000000),alt:z.string().trim().min(1).max(1000),caption:z.string().max(1000),jobId:z.string().min(1).max(200).optional()}).strict();
export type SectionImage=z.infer<typeof sectionImageSchema>;
/** Stable keys preserve heading identity when preceding paragraphs move. Duplicate titles use occurrence order. */
export function documentSections(text:string){const occurrences=new Map<string,number>();return text.replace(/\r\n?/g,'\n').split('\n').flatMap((line,index)=>{const match=/^#{1,3}\s+(.+?)\s*$/.exec(line);if(!match)return[];const title=match[1].replace(/\s+#+\s*$/,'').trim().normalize('NFC');if(!title||title.length>500)return[];const occurrence=occurrences.get(title)||0;occurrences.set(title,occurrence+1);return[{key:`section:${occurrence}:${title}`,title,line:index}];});}
export function unplacedSectionImages(text:string,media:MediaProject){const keys=new Set(documentSections(text).map(s=>s.key));return(media.sectionImages||[]).filter(image=>!keys.has(image.section));}
