import type { Reference, Job } from "./types";
/** New research policy. Historical records remain readable and are never rewritten. */
export function excludedResearchUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
    return ["wikipedia.org", "wikiwand.com", "wikipedia-on-ipfs.org"].some(
      (root) => host === root || host.endsWith("." + root),
    );
  } catch {
    return true;
  }
}
export function articleCandidate(
  url: string,
  title: string,
  excerpt: string,
  query: string,
) {
  if (excludedResearchUrl(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!/^https:$/.test(parsed.protocol) || parsed.username || parsed.password)
    return false;
  if (
    /^(?:account|accounts|login|signin)\./i.test(parsed.hostname) ||
    /^\/(?:store|shop|login|signin|account|search)(?:\/|$)/i.test(
      parsed.pathname,
    )
  )
    return false;
  if (parsed.pathname === "/" && title.trim().split(/\s+/).length < 4)
    return false;
  const ignored = new Set(
    "the and for with from this that ideas idea content research article posts write your about news latest first take general audience readers people".split(
      " ",
    ),
  );
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) || []),
  ].filter((t) => !ignored.has(t));
  const text = (title + " " + excerpt).toLowerCase();
  const matched = terms.filter((term) => text.includes(term)).length;
  return excerpt.length >= 60 && matched >= Math.min(2, terms.length || 1);
}
/** Source-reference fields only: mentions in a human's current prose are not silently erased. */
export function containsExcludedSource(text: string) {
  const normalized = text.replace(/\\\//g, "/");
  const urls = normalized.match(/https?:\/\/[^\s<>"'\\]+/gi) || [];
  if (urls.some((url) => excludedResearchUrl(url))) return true;
  return /(?:^|[\s(<"'\[])(?:[a-z0-9-]+\.)*(?:wikipedia\.org|wikiwand\.com|wikipedia-on-ipfs\.org)(?=$|[\s/:?#)>"'\]]|\.(?:\s|$))/i.test(
    normalized,
  );
}
export function eligibleSourceReferences(values: string[]) {
  return values.filter((value) => !containsExcludedSource(value));
}
export function eligibleSourceText(value: string) {
  return value
    .split("\n")
    .filter((line) => !containsExcludedSource(line))
    .join("\n");
}
export function eligibleEvidence<
  T extends {
    citations: { url: string }[];
    claims?: { sourceUrls: string[]; text?: string }[];
    summary?: string;
  },
>(items: T[]): T[] {
  return items
    .map((item) => {
      const citations = item.citations.filter(
          (c) => !excludedResearchUrl(c.url),
        ),
        allowed = new Set(citations.map((c) => c.url));
      const claims = item.claims?.filter(
        (claim) =>
          claim.sourceUrls.length > 0 &&
          claim.sourceUrls.every((url) => allowed.has(url)) &&
          !containsExcludedSource(claim.text || ""),
      );
      const removed =
        citations.length !== item.citations.length ||
        (claims?.length || 0) !== (item.claims?.length || 0) ||
        containsExcludedSource(item.summary || "");
      return {
        ...item,
        citations,
        ...(claims ? { claims } : {}),
        ...(removed && typeof item.summary === "string"
          ? {
              summary:
                "Excluded historical citations/claims were removed from this new request. Use only the remaining supplied passages; the original record is preserved.",
            }
          : {}),
      } as T;
    })
    .filter((item) => item.citations.length);
}
export function eligibleReferences(references: Reference[]): Reference[] {
  return references.flatMap((reference) => {
    if (reference.kind !== "source") return [reference];
    try {
      const value = JSON.parse(reference.content);
      if (
        Array.isArray(value.citations) &&
        value.citations.every(
          (c: unknown) => c && typeof (c as { url?: unknown }).url === "string",
        )
      ) {
        const cleaned = eligibleEvidence([value])[0];
        return cleaned
          ? [
              JSON.stringify(cleaned) === JSON.stringify(value)
                ? reference
                : { ...reference, content: JSON.stringify(cleaned) },
            ]
          : [];
      }
    } catch {}
    return containsExcludedSource(reference.content) ? [] : [reference];
  });
}
export function eligiblePipeline<T extends { sourceUrls: string[] }>(
  pipeline: T | undefined,
) {
  return pipeline
    ? { ...pipeline, sourceUrls: eligibleSourceReferences(pipeline.sourceUrls) }
    : undefined;
}
/** Legacy queued payloads cannot disclose excluded supporting sources; immutable history remains readable. */
export function jobHasExcludedSupport(job: Job) {
  // These adapters send only the explicit query/narration, never workflow refs.
  if (job.kind === "research") return containsExcludedSource(job.prompt);
  if (job.kind === "audio") return false;
  const references = (job.referenceSnapshots || []) as Reference[];
  const clean = eligibleReferences(references);
  if (
    clean.length !== references.length ||
    references.some(
      (r, i) => r.kind === "source" && clean[i]?.content !== r.content,
    )
  )
    return true;
  try {
    const prompt = JSON.parse(job.prompt);
    if (
      (prompt.webEvidence || []).some(
        (e: {
          citations?: { url: string }[];
          claims?: { sourceUrls: string[] }[];
        }) =>
          e.citations?.some((c) => excludedResearchUrl(c.url)) ||
          e.claims?.some((c) => c.sourceUrls.some(excludedResearchUrl)),
      )
    )
      return true;
    if (
      (prompt.idea?.sources || []).some((s: string) =>
        containsExcludedSource(s),
      )
    )
      return true;
    if (
      (prompt.pipeline?.sourceUrls || []).some((s: string) =>
        containsExcludedSource(s),
      )
    )
      return true;
    if (
      prompt.newsletterSource?.metadata &&
      containsExcludedSource(prompt.newsletterSource.metadata)
    )
      return true;
    if (
      (prompt.newsletterSources || []).some((source: { metadata?: string }) =>
        containsExcludedSource(source.metadata || ""),
      )
    )
      return true;
  } catch {}
  return false;
}
