import { test } from "node:test";
import assert from "node:assert/strict";
import {
  articleCandidate,
  eligibleEvidence,
  excludedResearchUrl,
} from "../lib/studio/source-policy";
import {
  publicIpv4,
  publicPageUrl,
  htmlEvidence,
} from "../lib/studio/public-page";
import {
  researchProfileSchema,
  researchQueries,
} from "../lib/studio/research-profile";
import { documentLayoutSchema } from "../lib/studio/document-layout";
test("Wikipedia/mirror domains are excluded and irrelevant store/account pages cannot qualify by brand word", () => {
  for (const url of [
    "https://wikipedia.org",
    "https://en.m.wikipedia.org/wiki/Test",
    "https://en.wikipedia.org./wiki/Test",
    "https://www.wikiwand.com/en/Test",
  ])
    assert.ok(excludedResearchUrl(url));
  assert.equal(excludedResearchUrl("https://example.org/report"), false);
  assert.equal(
    articleCandidate(
      "https://www.apple.com/",
      "Apple",
      "Apple home event news information ".repeat(5),
      "Apple home event",
    ),
    false,
  );
  assert.equal(
    articleCandidate(
      "https://account.apple.com/",
      "Apple account",
      "Apple home event sign in ".repeat(5),
      "Apple home event",
    ),
    false,
  );
  assert.ok(
    articleCandidate(
      "https://example.org/news/home-event",
      "Apple home event device announcement",
      "This report describes Apple home event devices and the installation requirements.",
      "Apple home event",
    ),
  );
  const historical = [
    {
      id: "old",
      citations: [
        { url: "https://en.wikipedia.org/wiki/Apple" },
        { url: "https://example.org/news" },
      ],
    },
  ];
  const selected = eligibleEvidence(historical);
  assert.equal(selected[0].citations.length, 1);
  assert.equal(historical[0].citations.length, 2);
});
test("public page reader rejects private/non-HTTPS/credential URLs and IP transport targets", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "198.18.0.1",
    "203.0.113.1",
    "224.0.0.1",
  ])
    assert.equal(publicIpv4(ip), false, ip);
  assert.ok(publicIpv4("8.8.8.8"));
  for (const url of [
    "http://example.org",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://user:pass@example.org/",
    "https://example.org:444/",
    "https://en.wikipedia.org/wiki/Test",
  ])
    assert.throws(() => publicPageUrl(url));
  assert.equal(
    publicPageUrl("https://example.org/article#part").href,
    "https://example.org/article",
  );
});
test("page extraction keeps actual article passages, date and title, excludes scripts and does not claim video viewing", () => {
  const result = htmlEvidence(
    '<html><head><title>Source title</title><meta property="article:published_time" content="2026-11-01"><meta name="author" content="Author"></head><body><nav>Menu junk</nav><article><h1>Home controls</h1><p>Useful evidence about local operation.</p><script>Steal secrets</script></article></body></html>',
  );
  assert.equal(result.title, "Source title");
  assert.equal(result.publishedAt, "2026-11-01");
  assert.equal(result.author, "Author");
  assert.match(result.text, /Useful evidence/);
  assert.doesNotMatch(result.text, /Steal secrets|Menu junk/);
});
test("source preferences and export layouts validate bounded settings without enabling excluded sources", () => {
  const profile = researchProfileSchema.parse({
    preferredDomains: ["example.org"],
    sectors: ["IoT"],
    depth: "deep",
  });
  assert.match(
    researchQueries("Home controls", profile).sector,
    /site:example.org/,
  );
  assert.equal(
    researchProfileSchema.safeParse({ preferredDomains: ["en.wikipedia.org"] })
      .success,
    false,
  );
  assert.equal(
    documentLayoutSchema.safeParse({ bodySize: 200 }).success,
    false,
  );
  assert.equal(
    documentLayoutSchema.safeParse({ font: "untrusted font" }).success,
    false,
  );
  assert.equal(documentLayoutSchema.parse({}).pageSize, "A4");
});
