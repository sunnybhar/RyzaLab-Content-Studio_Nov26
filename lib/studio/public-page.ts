import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { excludedResearchUrl } from "./source-policy";
export function publicIpv4(address: string) {
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b, c] = p;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || b === 88)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function publicPageUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !url.hostname.includes(".") ||
    /^\[|^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
    excludedResearchUrl(url.href)
  )
    throw Error(
      "Only accessible public HTTPS source pages are supported; excluded/private sources are not fetched.",
    );
  url.hash = "";
  return url;
}
export function htmlEvidence(html: string) {
  const meta = (name: string) => {
    const tags = html.match(/<meta\b[^>]*>/gi) || [];
    const tag = tags.find((t) =>
      new RegExp(`(?:name|property)=["']${name}["']`, "i").test(t),
    );
    return tag?.match(/content=["']([^"']*)["']/i)?.[1] || "";
  };
  const clean = (v: string) =>
    v
      .replace(
        /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
        " ",
      )
      .replace(/<[^>]*>/g, " ")
      .replace(
        /&(amp|lt|gt|quot|apos|nbsp);/g,
        (_: string, key: string) =>
          (
            ({
              amp: "&",
              lt: "<",
              gt: ">",
              quot: '"',
              apos: "'",
              nbsp: " ",
            }) as Record<string, string>
          )[key] || " ",
      )
      .replace(/\s+/g, " ")
      .trim();
  const article =
    /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] ||
    /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ||
    html;
  return {
    title: clean(
      meta("og:title") ||
        /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ||
        "",
    ).slice(0, 300),
    text: clean(article).slice(0, 16000),
    description: clean(meta("description") || meta("og:description")).slice(
      0,
      3000,
    ),
    publishedAt: meta("article:published_time").slice(0, 100),
    author: clean(meta("author")).slice(0, 200),
  };
}
/** DNS is resolved and the transport lookup is pinned to a checked public IPv4.
 * No cookies, authorization, scripts, secondary resources or unrestricted redirects. */
export async function readPublicPage(
  value: string,
  redirects = 0,
): Promise<{
  url: string;
  title: string;
  text: string;
  publishedAt: string;
  author: string;
  bytes: number;
  requests: number;
  sourceKind: "article_text" | "video_description";
}> {
  const url = publicPageUrl(value);
  if (redirects > 3) throw Error("Source redirect limit reached.");
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const records = await Promise.race([
    lookup(url.hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => {
      dnsTimer = setTimeout(() => reject(Error("Source DNS lookup timed out.")), 5000);
    }),
  ]).finally(() => { if (dnsTimer) clearTimeout(dnsTimer); });
  const ipv4 = records.filter((r) => r.family === 4);
  if (!ipv4.length || ipv4.some((r) => !publicIpv4(r.address)))
    throw Error("Source does not resolve to a supported public address.");
  const pinned = ipv4[0].address;
  const response = await new Promise<{
    status: number;
    location?: string;
    type: string;
    body: string;
    bytes: number;
  }>((resolve, reject) => {
    const pinnedLookup = ((
      _hostname: string,
      options: { all?: boolean },
      callback: (...args: unknown[]) => void,
    ) =>
      options.all
        ? callback(null, [{ address: pinned, family: 4 }])
        : callback(null, pinned, 4)) as unknown as LookupFunction;
    const req = httpsRequest(
      url,
      {
        method: "GET",
        family: 4,
        lookup: pinnedLookup,
        headers: {
          Accept: "text/html, text/plain;q=0.8",
          "Accept-Encoding": "identity",
          "User-Agent": "RyzaLabStudio research reader",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          res.destroy();
          resolve({
            status,
            location: res.headers.location,
            type: "",
            body: "",
            bytes: 0,
          });
          return;
        }
        const type = String(res.headers["content-type"] || "");
        if (
          res.headers["content-encoding"] &&
          res.headers["content-encoding"] !== "identity"
        ) {
          res.destroy();
          reject(Error("Unsupported source compression."));
          return;
        }
        if (
          status !== 200 ||
          !/text\/(?:html|plain)|application\/xhtml\+xml/i.test(type)
        ) {
          res.destroy();
          reject(Error(`Source unavailable or unsupported (${status}).`));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 524288) {
            res.destroy();
            req.destroy(Error("Source exceeds the 512 KB retrieval bound."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status,
            type,
            body: Buffer.concat(chunks).toString("utf8"),
            bytes,
          }),
        );
        res.on("error", reject);
      },
    );
    const deadline = setTimeout(
      () => req.destroy(Error("Source reading timed out.")),
      10000,
    );
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    req.end();
  });
  if (response.location)
    return readPublicPage(new URL(response.location, url).href, redirects + 1);
  const evidence = /html/i.test(response.type)
    ? htmlEvidence(response.body)
    : {
        title: url.hostname,
        text: response.body.slice(0, 16000),
        description: "",
        publishedAt: "",
        author: "",
      };
  const video =
    /(^|\.)youtube\.com$/.test(url.hostname) || url.hostname === "youtu.be";
  const text = video ? evidence.description : evidence.text;
  if (text.length < 100)
    throw Error(
      video
        ? "No accessible video description or transcript. Supply a transcript to use the video as evidence."
        : "Source page has insufficient extractable text.",
    );
  return {
    url: url.href,
    title: evidence.title || url.hostname,
    text,
    publishedAt: evidence.publishedAt,
    author: evidence.author,
    bytes: response.bytes,
    requests: redirects + 1,
    sourceKind: video ? "video_description" : "article_text",
  };
}
