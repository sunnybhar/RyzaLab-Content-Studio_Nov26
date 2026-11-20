import { researchSourceKey, researchSourceMinimum, researchSourceTarget } from "./research-methodology";
import {comprehensiveSearchAngles, investigationPlan} from "./research-plan";
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
  resultLimit = 3,
  relevanceQueries = [query],
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
    url.searchParams.set("count", String(resultLimit));
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
      ].slice(0, resultLimit)) {
        const field = (tag: string) =>
          plain(
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(
              item[1],
            )?.[1] || "",
          );
        const title = field("title").slice(0, 300),
          excerpt = field("description").slice(0, 1400);
        let link = field("link");
        let parsed: URL;
        try { parsed = new URL(link); } catch { continue; }
        if (
          parsed.hostname === "www.bing.com" &&
          parsed.pathname === "/news/apiclick.aspx"
        )
          link = parsed.searchParams.get("url") || link;
        let source: URL;
        try { source = new URL(link); } catch { continue; }
        if (
          source.protocol !== "https:" ||
          source.username ||
          source.password ||
          source.hostname.endsWith("bing.com") ||
          excerpt.length < 40 ||
          !title ||
          !relevanceQueries.some((topic) => articleCandidate(source.href, title, excerpt, topic))
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
async function withinResearchStep<T>(work: Promise<T>, ms: number, step: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${step} timed out.`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function retrieveBroadReferences(
  query: string,
  request: typeof fetch = fetch,
  now = new Date().toISOString(),
  profile: ResearchProfile = researchProfileSchema.parse({}),
  sourceUrls: string[] = [],
  pageReader?: typeof readPublicPage,
  quick = false,
  comprehensive = false,
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
  const plan = investigationPlan(query, comprehensive ? { ...profile, depth: "extended" } : profile);
  const limit = comprehensive ? researchSourceTarget : profile.depth === "focused" ? 6 : profile.depth === "deep" ? 12 : 20;
  const angles = comprehensive ? comprehensiveSearchAngles(query) : undefined;
  if (angles) plan.searches = angles.initial.map((item, index) => index === 0 && profile.preferredDomains.length
    ? { ...item, query: `${item.query} (${profile.preferredDomains.slice(0, 3).map((domain) => `site:${domain}`).join(" OR ")})` }
    : item);
  const relevanceQueries = angles?.relevance ?? [query];
  const relevant = (candidate: { url: string; title: string; citedText: string }) =>
    relevanceQueries.some((topic) => articleCandidate(candidate.url, candidate.title, candidate.citedText, topic));
  const search = (item: (typeof plan.searches)[number]) => {
    const discovery = discoverWeb(item.query, request, 6000, comprehensive ? 8 : 3, relevanceQueries);
    return quick
      ? withinResearchStep(discovery, 13000, "Web and news discovery").catch(() => ({
          citations: [], bytes: 0, gaps: ["Web and news discovery did not finish."],
        }))
      : discovery;
  };
  const initialSearch = search(plan.searches[0]);
  const follow = () => Promise.all(plan.searches.slice(1).map(async (item) => ({ search: item, result: await search(item) })));
  const [initial, followups] = quick || comprehensive
    ? await Promise.all([initialSearch, follow()])
    : [await initialSearch, await follow()] as const;
  let requests=2,bytes=initial.bytes;
  const gaps = [...initial.gaps];
  const groups = [initial.citations];
  for (const { search, result } of followups) {
    requests += 2;
    bytes += result.bytes;
    groups.push(result.citations);
    gaps.push(...result.gaps.map((gap) => search.purpose + ": " + gap));
  }
  if (angles) {
    const seen = new Set<string>();
    const domains = new Map<string, number>();
    const passages = new Set<string>();
    for (const citation of groups.flat()) {
      if (excluded(citation.url) || !relevant(citation)) continue;
      const key = researchSourceKey(citation.url);
      const domain = host(citation.url);
      const count = domains.get(domain) ?? 0;
      const passage = citation.citedText.toLowerCase().replace(/\W+/g, " ").trim();
      if (seen.has(key) || passages.has(passage) || count >= 2) continue;
      seen.add(key);
      passages.add(passage);
      domains.set(domain, count + 1);
    }
    if (seen.size < researchSourceMinimum) {
      plan.searches.push(...angles.followup);
      for (const result of await Promise.all(angles.followup.map(search))) {
        requests += 2;
        bytes += result.bytes;
        groups.push(result.citations);
        gaps.push(...result.gaps);
      }
    }
  }
  const found = comprehensive
    ? Array.from({ length: Math.max(...groups.map((group) => group.length)) }, (_, index) =>
        groups.flatMap((group) => group[index] ? [group[index]] : [])).flat()
    : groups.flat();
  const distinctCandidateUrls = new Set<string>();
  const distinctCandidatePassages = new Set<string>();
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
    .filter((c) => {
      if (excluded(c.url) || (!direct.has(c.url) && !relevant(c))) return false;
      const key = researchSourceKey(c.url);
      const passage = c.citedText.toLowerCase().replace(/\W+/g, " ").trim();
      if (distinctCandidateUrls.has(key) || (comprehensive && passage && distinctCandidatePassages.has(passage))) return false;
      distinctCandidateUrls.add(key);
      if (passage) distinctCandidatePassages.add(passage);
      return true;
    })
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
            (quick && !comprehensive && index + offset >= Math.max(6, supplied.length))) {
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
          const reading = reader(c.url);
          const page = quick ? await withinResearchStep(reading, 8000, "Source page reading") : await reading;
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
  if (citations.length < (comprehensive ? limit : 3) && (!quick || Date.now() + 12000 < deadline)) {
    requests++;
    try {
      const lookup = retrievePublicReferences(angles?.scholarlyQuery ?? query, request, now);
      const scholarly = quick ? await withinResearchStep(lookup, 12000, "Scholarly search") : await lookup;
      bytes += scholarly.retrieval.responseBytes;
      citations.push(...scholarly.citations.filter((c) => !excluded(c.url) && (!angles || relevant(c))));
    } catch {
      gaps.push("No additional accessible scholarly abstracts available.");
    }
  }
  const finalUrls = new Set<string>();
  const uniqueUrls = citations.filter((citation) => {
    const key = researchSourceKey(String(citation.url));
    if (finalUrls.has(key)) return false;
    finalUrls.add(key);
    return true;
  });
  const fingerprints=new Set<string>();let duplicatePassages=0;
  const unique=uniqueUrls.filter(c=>{const fingerprint=String(c.citedText).toLowerCase().replace(/\W+/g," ").trim();if(fingerprints.has(fingerprint)){duplicatePassages++;return false;}fingerprints.add(fingerprint);return true;}).slice(0,limit);
  if(duplicatePassages)gaps.push(`${duplicatePassages} repeated source passage(s) removed; different domains do not guarantee independent origins.`);
  if(!unique.some(c=>c.sourceKind==="article_text"||c.sourceKind==="document_extract"))gaps.push("No full article/document passages were accessible. Findings based on snippets/abstracts must remain qualified.");
  if (!unique.length)
    throw new StudioError(
      503,
      quick
        ? `No relevant non-Wikipedia evidence was retrieved. No paid idea/writing request was started. ${[...new Set(gaps)].slice(0, 3).join(" ")} Add an accessible source link to retry with evidence.`
        : "No relevant non-Wikipedia evidence was retrieved. No paid idea/writing request was started. Try a more specific public question or supply accessible source material.",
    );
  return publicResearchSchema.parse({
    version: 2,
    summary: `Retrieved ${unique.length} source extracts with ${new Set(unique.map((c) => host(String(c.url)))).size} domains. Depth: ${plan.depth}. Inspect relevance and evidence limits before relying on them.`,
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
