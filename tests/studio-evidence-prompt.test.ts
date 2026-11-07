import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { evidencePrompt } from "../lib/studio/evidence-prompt";
import { quote } from "../lib/studio/pricing";
function fixture() {
  const s = initialState(DEMO_ACTOR, true);
  s.connections.push({
    id: "bounded-writer",
    title: "Writer",
    provider: "openai",
    model: "fixture-writer",
    function: "text",
    hasKey: true,
    status: "validated",
    updatedAt: new Date().toISOString(),
    maxRequestCost: 50,
  } as any);
  s.settings.qualifiedRates = [
    {
      provider: "openai",
      model: "fixture-writer",
      function: "text",
      currency: "USD",
      inputCentsPerMillion: 1,
      outputCentsPerMillion: 1,
      maxInputBytes: 18000,
      maxOutputTokens: 2000,
      source: "https://example.com/prices",
      verifiedAt: "2026-11-07",
      qualified: true,
    },
  ];
  return s;
}
test("large research extracts fit qualified input while preserving task/copy and retaining explicit coverage", () => {
  const s = fixture(),
    original = {
      task: "Write only the requested post.",
      title: "Home automation handoff",
      currentCopy: "Exact human wording must remain intact.",
      webEvidence: [
        {
          jobId: "research",
          summary: "Source coverage.",
          claims: [],
          citations: Array.from({ length: 12 }, (_, i) => ({
            url: `https://example.org/article-${i}`,
            title: `Original source ${i}`,
            citedText:
              "A home automation handoff needs documented routines and practical limitations. ".repeat(
                100,
              ),
          })),
        },
      ],
    };
  const before = JSON.stringify(original);
  const prompt = evidencePrompt(
    s,
    "LinkedIn",
    "text",
    "bounded-writer",
    original,
  );
  const parsed = JSON.parse(prompt);
  assert.equal(parsed.currentCopy, original.currentCopy);
  assert.equal(parsed.task, original.task);
  assert.ok(parsed.evidenceCoverage.passagesExcerpted > 0);
  assert.equal(parsed.evidenceCoverage.researchSourcesRetained, 12);
  assert.ok(parsed.evidenceCoverage.researchSourcesIncluded > 0);
  assert.equal(JSON.stringify(original), before);
  assert.equal(
    evidencePrompt(s, "LinkedIn", "text", "bounded-writer", original),
    prompt,
  );
  assert.ok(
    quote(s, {
      kind: "text",
      channel: "LinkedIn",
      connectionId: "bounded-writer",
      prompt,
    }).pricingSnapshot.inputBytes <= 18000,
  );
});
test("newsletter outline and every selected source remain represented; oversized mandatory copy is never silently shortened", () => {
  const s = fixture(),
    sources = Array.from({ length: 3 }, (_, i) => ({
      title: `Story ${i}`,
      text: "A useful supplied source with practical limits. ".repeat(500),
      metadata: "Original source attribution.",
    }));
  const original = {
    task: "Write the combined issue.",
    title: "Three stories",
    currentCopy: "Human introduction.",
    newsletterOutline: "Opening\nStory one\nStory two\nStory three\nAnalysis",
    newsletterSources: sources,
    webEvidence: [],
  };
  const prompt = JSON.parse(
    evidencePrompt(s, "LinkedIn", "text", "bounded-writer", original),
  );
  assert.equal(prompt.newsletterSources.length, 3);
  assert.equal(prompt.newsletterOutline, original.newsletterOutline);
  assert.ok(
    prompt.newsletterSources.every((source: any) =>
      source.passageCoverage.includes("bounded"),
    ),
  );
  assert.throws(
    () =>
      evidencePrompt(s, "LinkedIn", "text", "bounded-writer", {
        ...original,
        currentCopy: "Mandatory human copy. ".repeat(10000),
      }),
    /protected rules, Instructions and task/,
  );
});
