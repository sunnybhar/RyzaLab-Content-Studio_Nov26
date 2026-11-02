import { publicResearchSchema } from "./research";
import { StudioError } from "./permissions";

async function boundedJson(url: URL, request: typeof fetch) {
  const response = await request(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "RyzaLabStudio/0.3.7 (public reference retrieval; https://ryzalab.com)",
    },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok || !response.body)
    throw new Error(`Source unavailable (${response.status})`);
  const reader = response.body.getReader(),
    parts: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      count += part.value.byteLength;
      if (count > 65536) {
        await reader.cancel();
        throw new Error("Source response exceeds the 64 KiB limit");
      }
      parts.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return { value: JSON.parse(new TextDecoder().decode(bytes)), bytes: count };
}
function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(
          /&(?:amp|lt|gt|quot|apos);/g,
          (match) =>
            ({
              "&amp;": "&",
              "&lt;": "<",
              "&gt;": ">",
              "&quot;": '"',
              "&apos;": "'",
            })[match] || match,
        )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}

/** Exactly two fixed public API hosts; never fetch a user/supplier-provided URL.
 * No paid search or model endpoint, redirects, continuation or retry. */
export async function retrievePublicReferences(
  query: string,
  request: typeof fetch = fetch,
  now = new Date().toISOString(),
) {
  if (query.trim().length < 5 || new TextEncoder().encode(query).length > 2000)
    throw new StudioError(
      400,
      "Use a public research question of 5–2000 UTF-8 bytes.",
    );
  const citations: {
      url: string;
      title: string;
      citedText: string;
      sourceKind: "reference_extract" | "scholarly_abstract";
      publishedAt?: string;
    }[] = [],
    gaps: string[] = [],
    providers: ("wikipedia" | "crossref")[] = [];
  let responseBytes = 0;
  const wiki = new URL("https://en.wikipedia.org/w/api.php");
  for (const [key, value] of Object.entries({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "0",
    gsrlimit: "3",
    prop: "extracts|info",
    explaintext: "1",
    exintro: "1",
    exchars: "1400",
    exlimit: "3",
    inprop: "url",
  }))
    wiki.searchParams.set(key, value);
  try {
    const result = await boundedJson(wiki, request);
    responseBytes += result.bytes;
    providers.push("wikipedia");
    if (result.value.error) throw new Error("Reference API error");
    const pages = Object.values(result.value.query?.pages || {}).slice(
      0,
      3,
    ) as Record<string, unknown>[];
    const countBefore = citations.length;
    for (const page of pages) {
      if (!page || typeof page !== "object") continue;
      const title = clean(page.title, 300),
        text = clean(page.extract, 1400);
      if (!title || text.length < 80) continue;
      citations.push({
        title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
        citedText: text,
        sourceKind: "reference_extract",
      });
    }
    if (citations.length === countBefore)
      gaps.push(
        "Wikipedia returned no usable introductory extracts for this question.",
      );
  } catch {
    gaps.push(
      "Wikipedia reference retrieval was unavailable or exceeded its response limit.",
    );
  }
  const crossref = new URL("https://api.crossref.org/works");
  crossref.searchParams.set("query", query);
  crossref.searchParams.set("rows", "3");
  crossref.searchParams.set("select", "title,DOI,abstract,published");
  try {
    const result = await boundedJson(crossref, request);
    responseBytes += result.bytes;
    providers.push("crossref");
    const items = Array.isArray(result.value.message?.items)
      ? result.value.message.items.slice(0, 3)
      : [];
    const countBefore = citations.length;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const title = clean(item.title?.[0], 300),
        text = clean(item.abstract, 1400),
        doi = typeof item.DOI === "string" ? item.DOI : "";
      if (
        !title ||
        text.length < 80 ||
        !/^10\.\d{4,9}\/[^\s<>]{1,200}$/i.test(doi)
      )
        continue;
      const date = item.published?.["date-parts"]?.[0];
      const publishedAt =
        Array.isArray(date) &&
        date.length &&
        date.length <= 3 &&
        date.every((n: unknown) => Number.isInteger(n))
          ? date
              .map((n: number, i: number) =>
                i === 0 ? String(n) : String(n).padStart(2, "0"),
              )
              .join("-")
          : undefined;
      citations.push({
        title,
        url: `https://doi.org/${encodeURI(doi).replaceAll("#", "%23").replaceAll("?", "%3F")}`,
        citedText: text,
        sourceKind: "scholarly_abstract",
        ...(publishedAt ? { publishedAt } : {}),
      });
    }
    if (citations.length === countBefore)
      gaps.push(
        "Crossref returned no usable scholarly abstracts for this question; title-only hits were excluded.",
      );
  } catch {
    gaps.push(
      "Crossref scholarly abstract retrieval was unavailable or exceeded its response limit.",
    );
  }
  if (!citations.length)
    throw new StudioError(
      503,
      "No usable public excerpts were retrieved. No paid model was called. Try a clearer public question or use saved references; this source coverage is limited to Wikipedia and Crossref abstracts.",
    );
  const excerptBytes = new TextEncoder().encode(
    citations.map((c) => c.citedText).join("\n"),
  ).length;
  if (excerptBytes > 12000)
    throw new StudioError(
      413,
      "Retrieved excerpt limit exceeded. No paid model was called.",
    );
  return publicResearchSchema.parse({
    version: 2,
    summary: `Retrieved ${citations.length} source excerpts. No AI synthesis or independent fact verification has been performed.`,
    citations,
    status: "retrieved_references",
    scope: "public_reference_apis",
    retrievedAt: now,
    claims: [],
    notice:
      "Coverage: Wikipedia introductory extracts and Crossref scholarly abstracts only, not unrestricted web/news search or full paper access. Excerpts are untrusted evidence; inspect original sources, publication dates and limitations. Attribute quoted material. Provider API charge for this retrieval step is zero; hosting/network costs are separate.",
    retrieval: {
      adapter: "public-refs-v1",
      requests: 2,
      responseBytes,
      excerptBytes,
      providers: [...new Set(providers)],
      gaps,
      providerChargeCents: 0,
    },
  });
}
