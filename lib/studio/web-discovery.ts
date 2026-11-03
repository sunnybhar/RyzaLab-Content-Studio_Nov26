import {retrievePublicReferences} from './public-retrieval';
import {publicResearchSchema} from './research';
import {StudioError} from './permissions';
const plain=(text:string)=>text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
/** Fixed search hosts only. Result URLs are citations, never fetched server-side.
 * Search excerpts are not full-page evidence or independent verification. */
export async function discoverWeb(query:string,request:typeof fetch=fetch){
 if(query.trim().length<5||new TextEncoder().encode(query).length>2000)throw new StudioError(400,'Enter a public question of 5–2000 bytes.');
 let bytes=0;const gaps:string[]=[],citations:{url:string;title:string;citedText:string;sourceKind:'web_search_excerpt'|'news_search_excerpt'}[]=[];
 for(const news of [false,true]){
  const url=new URL(news?'https://www.bing.com/news/search':'https://www.bing.com/search');url.searchParams.set('q',query);url.searchParams.set('format','rss');url.searchParams.set('count','3');
  try{
   const response=await request(url.toString(),{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Accept:'application/rss+xml, application/xml'}});
   if(!response.ok||!response.body)throw Error('Unavailable');const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
   try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536){await reader.cancel();throw Error('Response limit');}chunks.push(part.value);}}finally{reader.releaseLock();}
   bytes+=size;const xml=new TextDecoder().decode(Buffer.concat(chunks));if(!/<rss\b/i.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid feed');
   const before=citations.length;
   for(const item of [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,3)){
    const field=(tag:string)=>plain(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i').exec(item[1])?.[1]||'');
    const title=field('title').slice(0,300),excerpt=field('description').slice(0,1400);let link=field('link');
    const parsed=new URL(link);if(parsed.hostname==='www.bing.com'&&parsed.pathname==='/news/apiclick.aspx')link=parsed.searchParams.get('url')||link;
    const source=new URL(link);if(source.protocol!=='https:'||source.username||source.password||source.hostname.endsWith('bing.com')||excerpt.length<40||!title)continue;
    if(!citations.some(c=>c.url===source.href))citations.push({url:source.href,title,citedText:excerpt,sourceKind:news?'news_search_excerpt':'web_search_excerpt'});
   }
   if(citations.length===before)gaps.push(`${news?'News':'Web'} search returned no usable excerpts.`);
  }catch{gaps.push(`${news?'News':'Web'} search was unavailable, invalid or exceeded its response limit.`);}
 }
 return {citations,bytes,gaps};
}
export async function retrieveBroadReferences(query:string,request:typeof fetch=fetch,now=new Date().toISOString()){
 const [base,web]=await Promise.allSettled([retrievePublicReferences(query,request,now),discoverWeb(query,request)]);
 const original=base.status==='fulfilled'?base.value:undefined,found=web.status==='fulfilled'?web.value:{citations:[],bytes:0,gaps:['Web/news search unavailable.']};
 const citations=[...found.citations,...(original?.citations||[])].filter((c,i,a)=>a.findIndex(other=>other.url===c.url)===i).slice(0,6);
 if(!citations.length)throw new StudioError(503,'No usable web, news or reference excerpts were retrieved. No paid model was called. Try a more specific public topic.');
 return publicResearchSchema.parse({version:2,summary:`Retrieved ${citations.length} public source excerpts; inspect original links before relying on them.`,citations,status:'retrieved_references',scope:'public_reference_apis',retrievedAt:now,claims:[],notice:'Web/news search excerpts plus available Wikipedia and Crossref references. Search results may be incomplete or unavailable. Linked pages have not been fetched or independently verified. Check the original website, date and claim. No paid search API calls; hosting/network costs are separate.',retrieval:{adapter:'public-refs-v1',requests:4,responseBytes:(original?.retrieval.responseBytes||0)+found.bytes,excerptBytes:new TextEncoder().encode(citations.map(c=>c.citedText).join('\n')).length,providers:[...(found.citations.length?['bing_web','bing_news']:[]),...(original?.retrieval.providers||[])],gaps:[...found.gaps,...(original?.retrieval.gaps||['Wikipedia/Crossref unavailable.'])].slice(0,4),providerChargeCents:0}});
}
