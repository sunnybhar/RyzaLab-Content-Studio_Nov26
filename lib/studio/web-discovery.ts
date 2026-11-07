import {readPublicPage} from "./public-page";
import {researchProfileSchema,researchQueries,type ResearchProfile} from "./research-profile";
import {excludedResearchUrl,articleCandidate} from "./source-policy";
import { retrievePublicReferences } from "./public-retrieval";
import { publicResearchSchema } from "./research";
import { StudioError } from "./permissions";
const plain = (text: string) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
/** Fixed search hosts only. Result URLs are citations, never fetched server-side.
 * Search excerpts are not full-page evidence or independent verification. */
export async function discoverWeb(
  query: string,
  request: typeof fetch = fetch,
) {
  if (query.trim().length < 5 || new TextEncoder().encode(query).length > 2000)
    throw new StudioError(400, "Enter a public question of 5–2000 bytes.");
  let bytes = 0;
  const gaps: string[] = [],
    citations: {
      url: string;
      title: string;
      citedText: string;
      sourceKind: "web_search_excerpt" | "news_search_excerpt";
    }[] = [];
  for (const news of [false, true]) {
    const url = new URL(
      news ? "https://www.bing.com/news/search" : "https://www.bing.com/search",
    );
    url.searchParams.set("q", query);
    url.searchParams.set("format", "rss");
    url.searchParams.set("count", "3");
    try {
      const response = await request(url.toString(), {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "application/rss+xml, application/xml" },
      });
      if (!response.ok || !response.body) throw Error("Unavailable");
      const reader = response.body.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 65536) {
            await reader.cancel();
            throw Error("Response limit");
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      bytes += size;
      const xml = new TextDecoder().decode(Buffer.concat(chunks));
      if (!/<rss\b/i.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml))
        throw Error("Invalid feed");
      const before = citations.length;
      for (const item of [
        ...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
      ].slice(0, 3)) {
        const field = (tag: string) =>
          plain(
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(
              item[1],
            )?.[1] || "",
          );
        const title = field("title").slice(0, 300),
          excerpt = field("description").slice(0, 1400);
        let link = field("link");
        const parsed = new URL(link);
        if (
          parsed.hostname === "www.bing.com" &&
          parsed.pathname === "/news/apiclick.aspx"
        )
          link = parsed.searchParams.get("url") || link;
        const source = new URL(link);
        if (
          source.protocol !== "https:" ||
          source.username ||
          source.password ||
          source.hostname.endsWith("bing.com") ||
          excerpt.length < 40 ||
          !title || !articleCandidate(source.href,title,excerpt,query)
        )
          continue;
        if (!citations.some((c) => c.url === source.href))
          citations.push({
            url: source.href,
            title,
            citedText: excerpt,
            sourceKind: news ? "news_search_excerpt" : "web_search_excerpt",
          });
      }
      if (citations.length === before)
        gaps.push(
          `${news ? "News" : "Web"} search returned no usable excerpts.`,
        );
    } catch {
      gaps.push(
        `${news ? "News" : "Web"} search was unavailable, invalid or exceeded its response limit.`,
      );
    }
  }
  return { citations, bytes, gaps };
}
export async function retrieveBroadReferences(query:string,request:typeof fetch=fetch,now=new Date().toISOString(),profile:ResearchProfile=researchProfileSchema.parse({})){
 const plan=researchQueries(query,profile),limit=profile.depth==="focused"?6:profile.depth==="deep"?12:20;
 const initial=await discoverWeb(plan.sector,request);let requests=2,bytes=initial.bytes;const gaps=[...initial.gaps];
 const host=(url:string)=>new URL(url).hostname.toLowerCase().replace(/^www\./,"");
 const excluded=(url:string)=>excludedResearchUrl(url)||profile.excludedDomains.some(d=>host(url)===d||host(url).endsWith("."+d));
 const found=[...initial.citations];
 if(profile.depth!=="focused"||new Set(found.filter(c=>!excluded(c.url)).map(c=>host(c.url))).size<3){const wider=await discoverWeb(plan.wider,request);requests+=2;bytes+=wider.bytes;found.push(...wider.citations);gaps.push(profile.depth!=="focused"?"Wider discovery included for the selected research depth.":"Wider discovery used because specialist discovery had fewer than three source domains.",...wider.gaps);}
 const byDomain=new Map<string,number>();const candidates=found.filter((c,i,a)=>!excluded(c.url)&&a.findIndex(other=>other.url===c.url)===i&&articleCandidate(c.url,c.title,c.citedText,query)).filter(c=>{const domain=host(c.url),count=byDomain.get(domain)||0;if(count>=2)return false;byDomain.set(domain,count+1);return true;}).slice(0,limit);
 const citations:Record<string,unknown>[]=[];
 // Read in bounded groups; test-injected search responses never trigger real page networking.
 for(let index=0;index<candidates.length;index+=3){const batch=await Promise.all(candidates.slice(index,index+3).map(async c=>{if(request!==fetch)return {...c,accessNote:"Search excerpt only; linked page not fetched by this adapter invocation."};try{requests++;const page=await readPublicPage(c.url);bytes+=page.bytes;requests+=page.requests-1;if(excluded(page.url))return;return {url:page.url,title:page.title,citedText:page.text.slice(0,Math.floor(60000/Math.max(1,candidates.length))),sourceKind:page.sourceKind,publishedAt:page.publishedAt||undefined,author:page.author||undefined,accessNote:page.sourceKind==="video_description"?"Creator description only; video/transcript not watched or retrieved.":"Accessible article text extracted within a 512 KB retrieval bound; this passage is a bounded extract, not independent verification."};}catch{gaps.push(`Page unavailable or unsupported at ${host(c.url)}; only its discovery excerpt is available.`);return {...c,accessNote:"Search excerpt only; page extraction was unavailable."};}}));citations.push(...batch.filter(Boolean) as Record<string,unknown>[]);}
 if(citations.length<3){try{const scholarly=await retrievePublicReferences(query,request,now);requests++;bytes+=scholarly.retrieval.responseBytes;citations.push(...scholarly.citations.filter(c=>!excluded(c.url)));}catch{gaps.push("No additional accessible scholarly abstracts available.");}}
 const unique=citations.filter((c,i,a)=>a.findIndex(other=>other.url===c.url)===i).slice(0,limit);
 if(!unique.length)throw new StudioError(503,"No relevant non-Wikipedia evidence was retrieved. No paid idea/writing request was started. Try a more specific public question or supply accessible source material.");
 return publicResearchSchema.parse({version:2,summary:`Retrieved ${unique.length} relevant source extracts with ${new Set(unique.map(c=>host(String(c.url)))).size} domains. Depth: ${profile.depth}. Inspect evidence limits before relying on it.`,citations:unique,status:"retrieved_references",scope:"public_reference_apis",retrievedAt:now,claims:[],notice:"Sector-first web/news discovery, broader search when needed, bounded public-page reading and optional scholarly abstracts. Wikipedia is excluded. Source cards state whether article text, video description or only a search excerpt was retrieved; snippets do not establish full-page access or fact verification. No paid search API call was made; hosting/network costs are separate.",retrieval:{adapter:"bounded-web-v2",requests,responseBytes:Math.max(1,bytes),excerptBytes:new TextEncoder().encode(unique.map(c=>c.citedText).join("\n")).length,providers:["bing_web","bing_news",...(unique.some(c=>c.sourceKind==="article_text"||c.sourceKind==="video_description")?["public_page"]:[]),...(unique.some(c=>c.sourceKind==="scholarly_abstract")?["crossref"]:[])],gaps:[...new Set(gaps)].map(g=>g.slice(0,300)).slice(0,20),providerChargeCents:0}});
}
