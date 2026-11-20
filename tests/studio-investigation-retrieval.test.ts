import { test } from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import { investigationPlan } from "../lib/studio/research-plan";
import { applyWritingResearchCoverage } from "../lib/studio/research-methodology";
import { researchProfileSchema } from "../lib/studio/research-profile";
import { retrieveBroadReferences } from "../lib/studio/web-discovery";
import { publicPdfEvidence } from "../lib/studio/pdf-evidence";
test("bounded investigation explicitly pursues original evidence and contrary reporting", () => {
  const focused = investigationPlan(
    "household control handoff",
    researchProfileSchema.parse({ depth: "focused" }),
  );
  const deep = investigationPlan(
    "household control handoff",
    researchProfileSchema.parse({}),
  );
  const extended = investigationPlan(
    "household control handoff",
    researchProfileSchema.parse({ depth: "extended" }),
  );
  assert.equal(focused.searches.length, 2);
  assert.equal(deep.searches.length, 4);
  assert.equal(extended.searches.length, 6);
  assert.match(JSON.stringify(deep.searches), /original data|methodology/);
  assert.match(JSON.stringify(deep.searches), /criticism correction/);
  assert.match(extended.searches[4].query, /sample baseline/);
});
test("multi-query retrieval reads permitted articles and PDFs and records actual coverage", async () => {
  const queries: string[] = [];
  let n = 0;
  const request = (async (input: any) => {
    const url = new URL(String(input));
    queries.push(url.searchParams.get("q") || "");
    n++;
    return new Response(
      `<rss><channel><item><title>Household control handoff specialist evidence ${n}</title><link>https://source${n}.example.org/research/handoff</link><description>Household control handoff documentation explains practical household limitations and supported routines with study number ${n}.</description></item></channel></rss>`,
    );
  }) as typeof fetch;
  const read: string[] = [];
  const result = await retrieveBroadReferences(
    "household control handoff",
    request,
    "2026-11-08T02:00:00.000Z",
    researchProfileSchema.parse({}),
    ["https://standards.example.org/handoff.pdf"],
    async (url) => {
      read.push(url);
      return {
        url,
        title: "Household handoff research",
        text: `Original household control handoff evidence at ${url}, with documented methods and explicit limitations. `.repeat(
          3,
        ),
        bytes: 500,
        requests: 1,
        publishedAt: "2026-01-01",
        author: "Researcher",
        sourceKind: url.endsWith(".pdf") ? "document_extract" : "article_text",
      };
    },
  );
  assert.equal(queries.length, 8);
  assert.ok(queries.some((q) => q.includes("criticism correction")));
  assert.ok(read.includes("https://standards.example.org/handoff.pdf"));
  assert.ok(result.citations.some((c) => c.sourceKind === "document_extract"));
  assert.equal(result.retrieval.plan?.searches.length, 4);
  assert.equal(result.retrieval.coverage?.sourcesRead, read.length);
  assert.equal(result.retrieval.coverage?.excerptsOnly, 0);
  assert.ok(!JSON.stringify(result).includes("wikipedia.org"));
});
test("searchable public PDFs retain page locators; unreadable or overlong PDFs fail without pretending OCR", async () => {
  const pdf = new jsPDF();
  pdf.text(
    "Household control handoff research describes the original sample, units and limitations. This document explains the practical boundary of local control and the method used for testing.",
    10,
    20,
    { maxWidth: 180 },
  );
  const result = await publicPdfEvidence(
    new Uint8Array(pdf.output("arraybuffer")),
  );
  assert.equal(result.pagesRead, 1);
  assert.match(result.text, /\[Page 1\]/);
  assert.match(result.text, /original sample/);
  await assert.rejects(
    () => publicPdfEvidence(new Uint8Array([1, 2, 3])),
    /Unsupported/,
  );
  const blank = new jsPDF();
  await assert.rejects(
    () => publicPdfEvidence(new Uint8Array(blank.output("arraybuffer"))),
    /insufficient searchable text/,
  );
  const long = new jsPDF();
  for (let i = 0; i < 20; i++) long.addPage();
  await assert.rejects(
    () => publicPdfEvidence(new Uint8Array(long.output("arraybuffer"))),
    /20-page/,
  );
});

test("comprehensive research examines fifteen distinct results across six search angles", async () => {
  const queries: string[] = [];
  const checked: string[] = [];
  const request: typeof fetch = async (input) => {
    const url = new URL(String(input));
    queries.push(url.searchParams.get("q") || "");
    const index = queries.length;
    assert.equal(url.searchParams.get("count"), "8");
    const items = Array.from({ length: 5 }, (_, offset) => {
      const n = index * 5 + offset;
      return `<item><title>Household control handoff source ${n}</title><link>https://publication${n}.example.org/reports/handoff</link><description>Household control handoff research shows specific methods, supported routines and explicit limitations for sample number ${n}.</description></item>`;
    }).join("");
    return new Response(`<rss><channel>${items}</channel></rss>`);
  };
  const result = await retrieveBroadReferences(
    "household control handoff", request, "2026-11-20T02:00:00.000Z",
    researchProfileSchema.parse({}), [], async (url) => {
      checked.push(url);
      return {
        url, title: "Household control handoff", bytes: 500, requests: 1, publishedAt: "2026-01-01", author: "Researcher",
        sourceKind: "article_text",
        text: `Original household control handoff findings from ${url} measured routines with clearly described methods and limitations.`,
      };
    }, true, true,
  );
  assert.equal(queries.length, 12);
  assert.ok(queries.some((query) => query.includes("YouTube")));
  assert.equal(checked.length, 15);
  assert.equal(result.citations.length, 15);
  assert.equal(result.retrieval.coverage?.sourcesRead, 15);
  const prompt = JSON.stringify({ webEvidence: [{ citations: result.citations }] });
  assert.deepEqual(applyWritingResearchCoverage(prompt), { prompt, sourceCount: 15 });
  const insufficient = JSON.stringify({ webEvidence: [{ citations: [...result.citations.slice(0, 4),
    { url: result.citations[0].url + "?utm_source=duplicate#details" }] }] });
  const limited = applyWritingResearchCoverage(insufficient);
  assert.equal(limited.sourceCount, 4);
  assert.match(JSON.parse(limited.prompt).evidenceScope, /Complete the requested draft/);
  assert.deepEqual(JSON.parse(limited.prompt).webEvidence, JSON.parse(insufficient).webEvidence);
  const noEvidence = applyWritingResearchCoverage(JSON.stringify({ evidenceScope: "Provided references only." }));
  assert.equal(noEvidence.sourceCount, 0);
  assert.match(JSON.parse(noEvidence.prompt).evidenceScope, /Omit unsupported factual assertions/);
});

test("sparse nursery-camera headline coverage triggers alternate baby-monitor searches", async () => {
  const searches: string[] = [];
  const request: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const query = url.searchParams.get("q") ?? "";
    searches.push(query);
    const start = query.includes("remote access") ? 3
      : query.includes("non WiFi") ? 7
      : query.includes("retention delete") ? 11 : 0;
    const items = Array.from({ length: start ? 4 : 3 }, (_, offset) => {
      const index = start + offset;
      return `<item><title>Baby monitor privacy review ${index}</title><link>https://publication${index}.example.org/monitor-review</link><description>Independent baby monitor review ${index} compares privacy controls, video storage, account security, and vendor support.</description></item>`;
    }).join("");
    return new Response(`<rss><channel>${items}</channel></rss>`);
  };
  const result = await retrieveBroadReferences(
    "Before you buy a discounted nursery camera, ask where the footage goes",
    request, "2026-11-20T02:00:00Z", researchProfileSchema.parse({}), [],
    async (url) => ({
      url, title: "Baby monitor privacy review", bytes: 500, requests: 1, publishedAt: "2026-01-01",
      author: "Test author", sourceKind: "article_text",
      text: `Baby monitor privacy and storage testing from ${url}, with practical observations and limitations.`,
    }), true, true,
  );
  assert.equal(result.retrieval.plan?.searches.length, 9);
  assert.ok(searches.some((query) => query.includes("baby monitor local storage cloud recording")));
  assert.ok(searches.every((query) => !query.includes("discounted")));
  assert.equal(result.citations.length, 15);
  assert.equal(applyWritingResearchCoverage(JSON.stringify({ webEvidence: [{ citations: result.citations }] })).sourceCount, 15);
});
