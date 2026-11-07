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
export function eligibleEvidence<T extends { citations: { url: string }[] }>(
  items: T[],
) {
  return items
    .map((item) => ({
      ...item,
      citations: item.citations.filter((c) => !excludedResearchUrl(c.url)),
    }))
    .filter((item) => item.citations.length);
}
