import {investigationPlan} from "./research-plan";
import { readPublicPage, publicPageUrl } from "./public-page";
import {
  researchProfileSchema,
  researchQueries,
  type ResearchProfile,
} from "./research-profile";
import { excludedResearchUrl, articleCandidate } from "./source-policy";
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
/** Fixed search hosts only. Result URLs are validated separately before page retrieval.
 * Search excerpts are not full-page evidence or independent verification. */
export async function discoverWeb(
  query: string,
  request: typeof fetch = fetch,
  timeoutMs=10000,
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
        signal: AbortSignal.timeout(timeoutMs),
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
          !title ||
          !articleCandidate(source.href, title, excerpt, query)
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
export async function retrieveBroadReferences(
  query: string,
  request: typeof fetch = fetch,
  now = new Date().toISOString(),
  profile: ResearchProfile = researchProfileSchema.parse({}),
  sourceUrls: string[] = [],
  pageReader?: typeof readPublicPage,
  quick = false,
) {
  const supplied = [
    ...new Set(sourceUrls.map((value) => publicPageUrl(value).href)),
  ];
  if (supplied.length > 10)
    throw new StudioError(400, "Supply at most ten public source links.");
  const host = (url: string) =>
    new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const excluded = (url: string) =>
    excludedResearchUrl(url) ||
    profile.excludedDomains.some(
      (d) => host(url) === d || host(url).endsWith("." + d),
    );
  if (supplied.some(excluded))
    throw new StudioError(
      400,
      "A supplied link is excluded by the research source policy. Remove it or update Source Preferences; Wikipedia cannot be enabled.",
    );
  const started=Date.now(), deadline=started+(quick ? 50000 : 65000);
  const plan=investigationPlan(query,profile),limit=profile.depth==="focused"?6:profile.depth==="deep"?12:20;
  const search = (item: (typeof plan.searches)[number]) => discoverWeb(item.query, request, 6000);
  const initialSearch = search(plan.searches[0]);
  const follow = () => Promise.all(plan.searches.slice(1).map(async (item) => ({ search: item, result: await search(item) })));
  const [initial, followups] = quick
    ? await Promise.all([initialSearch, follow()])
    : [await initialSearch, await follow()] as const;
  let requests=2,bytes=initial.bytes;
  const gaps=[...initial.gaps],found=[...initial.citations];
  for(const {search,result} of followups){requests+=2;bytes+=result.bytes;found.push(...result.citations);gaps.push(...result.gaps.map(g=>search.purpose+": "+g));}
  const direct = new Set(supplied),
    byDomain = new Map<string, number>();
  const candidates = [
    ...supplied.map((url) => ({
      url,
      title: url,
      citedText: "",
      sourceKind: "web_search_excerpt" as const,
    })),
    ...found,
  ]
    .filter(
      (c, i, a) =>
        !excluded(c.url) &&
        a.findIndex((other) => other.url === c.url) === i &&
        (direct.has(c.url) ||
          articleCandidate(c.url, c.title, c.citedText, query)),
    )
    .filter((c) => {
      const domain = host(c.url),
        count = byDomain.get(domain) || 0;
      if (count >= 2) return false;
      byDomain.set(domain, count + 1);
      return true;
    })
    .slice(0, limit);
  if (supplied.some((url) => !candidates.some((c) => c.url === url)))
    gaps.push(
      "Some supplied links exceeded the depth/source/per-domain bound and were not fetched.",
    );
  const citations: Record<string, unknown>[] = [];
  const reader = pageReader || readPublicPage;
  for (let index = 0; index < candidates.length; index += 3) {
    const batch = await Promise.all(
      candidates.slice(index, index + 3).map(async (c, offset) => {
        if ((request !== fetch && !pageReader) || bytes > 5 * 1024 * 1024 ||
            Date.now() + (quick ? 7000 : 12000) > deadline ||
            (quick && index + offset >= Math.max(6, supplied.length))) {
          if (!c.citedText) {
            gaps.push(
              `Supplied source at ${host(c.url)} was not read within this retrieval invocation/budget.`,
            );
            return;
          }
          return {
            ...c,
            accessNote:
              "Search excerpt only; linked page was not fetched within this invocation/budget.",
          };
        }
        try {
          requests++;
          const page = await reader(c.url);
          bytes += page.bytes;
          requests += page.requests - 1;
          if (excluded(page.url)) return;
          return {
            url: page.url,
            title: page.title,
            citedText: page.text.slice(
              0,
              Math.floor(60000 / Math.max(1, candidates.length)),
            ),
            sourceKind: page.sourceKind,
            publishedAt: page.publishedAt || undefined,
            author: page.author || undefined,
            accessNote:
              page.sourceKind === "document_extract" ? "Searchable PDF text, page labels retained; at most 20 pages/16,000 characters, no OCR or table-layout verification." : page.sourceKind === "video_description"
                ? "Creator description only; video/transcript not watched or retrieved."
                : "Accessible article text extracted within a 512 KB page bound; this is a bounded passage, not independent verification.",
          };
        } catch {
          gaps.push(
            `Page unavailable or unsupported at ${host(c.url)}${c.citedText ? "; only its discovery excerpt is available." : "; no evidence from this supplied link was included."}`,
          );
          if (c.citedText)
            return {
              ...c,
              accessNote:
                "Search excerpt only; page extraction was unavailable.",
            };
        }
      }),
    );
    citations.push(...(batch.filter(Boolean) as Record<string, unknown>[]));
  }
  if (citations.length < 3 && (!quick || Date.now() + 12000 < deadline)) {
    requests++;
    try {
      const scholarly = await retrievePublicReferences(query, request, now);
      bytes += scholarly.retrieval.responseBytes;
      citations.push(...scholarly.citations.filter((c) => !excluded(c.url)));
    } catch {
      gaps.push("No additional accessible scholarly abstracts available.");
    }
  }
  const uniqueUrls=citations.filter((c,i,a)=>a.findIndex(other=>other.url===c.url)===i);
  const fingerprints=new Set<string>();let duplicatePassages=0;
  const unique=uniqueUrls.filter(c=>{const fingerprint=String(c.citedText).toLowerCase().replace(/\W+/g," ").trim();if(fingerprints.has(fingerprint)){duplicatePassages++;return false;}fingerprints.add(fingerprint);return true;}).slice(0,limit);
  if(duplicatePassages)gaps.push(`${duplicatePassages} repeated source passage(s) removed; different domains do not guarantee independent origins.`);
  if(!unique.some(c=>c.sourceKind==="article_text"||c.sourceKind==="document_extract"))gaps.push("No full article/document passages were accessible. Findings based on snippets/abstracts must remain qualified.");
  if (!unique.length)
    throw new StudioError(
      503,
      "No relevant non-Wikipedia evidence was retrieved. No paid idea/writing request was started. Try a more specific public question or supply accessible source material.",
    );
  return publicResearchSchema.parse({
    version: 2,
    summary: `Retrieved ${unique.length} source extracts with ${new Set(unique.map((c) => host(String(c.url)))).size} domains. Depth: ${profile.depth}. Inspect relevance and evidence limits before relying on them.`,
    citations: unique,
    status: "retrieved_references",
    scope: "public_reference_apis",
    retrievedAt: now,
    claims: [],
    notice:
      "Sector-first web/news discovery, wider search, optional explicit source links, bounded public-page reading and scholarly abstracts. Wikipedia is excluded. Source cards distinguish article text, video descriptions and search excerpts; they do not imply fact verification or video viewing. No paid search API call was made; hosting/network costs are separate.",
    retrieval: {
      adapter: "bounded-web-v2",
      plan,
      coverage:{sourcesRead:unique.filter(c=>["article_text","document_extract","video_description","video_transcript"].includes(String(c.sourceKind))).length,excerptsOnly:unique.filter(c=>!["article_text","document_extract","video_description","video_transcript"].includes(String(c.sourceKind))).length,domains:new Set(unique.map(c=>host(String(c.url)))).size,duplicatePassages,elapsedMs:Date.now()-started},
      requests,
      responseBytes: Math.max(1, bytes),
      excerptBytes: new TextEncoder().encode(
        unique.map((c) => c.citedText).join("\n"),
      ).length,
      providers: [
        "bing_web",
        "bing_news",
        ...(unique.some(
          (c) =>
            c.sourceKind === "article_text" || c.sourceKind === "document_extract" ||
            c.sourceKind === "video_description",
        )
          ? ["public_page"]
          : []),
        ...(unique.some((c) => c.sourceKind === "scholarly_abstract")
          ? ["crossref"]
          : []),
      ],
      gaps: [...new Set(gaps)].map((g) => g.slice(0, 300)).slice(0, 20),
      providerChargeCents: 0,
    },
  });
}
