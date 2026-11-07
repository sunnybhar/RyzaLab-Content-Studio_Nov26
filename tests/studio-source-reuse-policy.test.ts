import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eligibleEvidence,
  eligibleReferences,
  jobHasExcludedSupport,
  containsExcludedSource,
} from "../lib/studio/source-policy";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { generationInput } from "../lib/studio/generation";
import { extractResearchResult } from "../lib/studio/research";
import { parseGeneratedIdeas } from "../lib/studio/idea-generation";
import { copyIdentity } from "../lib/studio/solo-quality";
import { settleWrittenOutput } from "../lib/studio/draft-candidates";
import type { Job, Reference } from "../lib/studio/types";
const wiki = "https://en.wikipedia.org/wiki/Home_automation",
  allowed = "https://example.org/original";
function result() {
  return {
    version: 1,
    summary: "Historical result with a source later excluded.",
    citations: [
      {
        url: wiki,
        title: "Wikipedia",
        citedText: "An older retained passage.",
      },
      {
        url: allowed,
        title: "Original documentation",
        citedText: "An original technical passage.",
      },
    ],
    claims: [
      { text: "Claim from the excluded source.", sourceUrls: [wiki] },
      { text: "A permitted attributed claim.", sourceUrls: [allowed] },
    ],
    searchesObserved: 1,
    stopReason: "end_turn",
    errors: [],
    status: "cited_research",
    notice: "Retained provenance, not independent verification.",
  };
}
test("new evidence filters excluded citations, dependent claims and summary without changing historical records", () => {
  const original = result(),
    before = JSON.stringify(original),
    filtered = eligibleEvidence([original])[0];
  assert.deepEqual(
    filtered.citations.map((c) => c.url),
    [allowed],
  );
  assert.equal(filtered.claims!.length, 1);
  assert.deepEqual(filtered.claims![0].sourceUrls, [allowed]);
  assert.match(filtered.summary, /historical citations/);
  assert.equal(JSON.stringify(original), before);
  assert.equal(
    containsExcludedSource("https://not-wikipedia.org/article"),
    false,
  );
  assert.equal(
    containsExcludedSource("Source: en.wikipedia.org/wiki/Home"),
    true,
  );
});
test("workflow source snapshots sanitize mixed legacy research and preserve unrelated JSON formatting", () => {
  const reference = {
    id: "retained",
    title: "Old research",
    kind: "source",
    channel: "LinkedIn",
    sourceJobId: "old-job",
    content: JSON.stringify(result(), null, 2),
    createdAt: "2026-11-01T12:00:00Z",
  } as Reference;
  const clean = eligibleReferences([reference]);
  assert.ok(!clean[0].content.includes(wiki));
  assert.ok(reference.content.includes(wiki));
  assert.equal(
    jobHasExcludedSupport({
      kind: "text",
      prompt: "{}",
      referenceSnapshots: [reference],
    } as Job),
    true,
  );
  assert.equal(
    jobHasExcludedSupport({
      kind: "text",
      prompt: "{}",
      referenceSnapshots: clean,
    } as Job),
    false,
  );
  const permitted = {
    ...reference,
    content: JSON.stringify(
      {
        ...result(),
        summary: "Permitted record",
        citations: [result().citations[1]],
        claims: [result().claims[1]],
      },
      null,
      2,
    ),
  };
  assert.equal(eligibleReferences([permitted])[0].content, permitted.content);
  assert.equal(
    jobHasExcludedSupport({
      kind: "text",
      prompt: "{}",
      referenceSnapshots: [permitted],
    } as Job),
    false,
  );
});
test("manual ideas and new writing reuse permitted sources while old research/idea provenance remains readable", () => {
  let s = initialState(DEMO_ACTOR, true);
  s.jobs = [
    {
      id: "old-research",
      kind: "research",
      channel: "LinkedIn",
      createdBy: DEMO_ACTOR.email,
      state: "succeeded",
      createdAt: "2026-11-01T12:00:00Z",
      result: JSON.stringify(result()),
    } as Job,
  ];
  s = applyCommand(s, DEMO_ACTOR, {
    type: "idea.create",
    title: "Household handoff",
    brief: "A useful documentation angle.",
    channel: "LinkedIn",
    researchJobIds: ["old-research"],
  });
  const idea = s.ideas[0];
  assert.deepEqual(idea.sources, [allowed]);
  idea.sources.push(wiki);
  const d = s.contents[0];
  d.channel = "LinkedIn";
  d.state = "draft";
  d.ideaId = idea.id;
  s.settings.defaultConnections = { text: "fixture-writer" };
  const input = generationInput(s, DEMO_ACTOR, {
      contentId: d.id,
      kind: "text",
      expectedRevision: d.revision,
      idempotencyKey: "fresh-writing",
    }),
    prompt = JSON.parse(input.prompt);
  assert.deepEqual(prompt.idea.sources, [allowed]);
  assert.equal(prompt.webEvidence[0].citations.length, 1);
  assert.ok(s.jobs[0].result!.includes(wiki));
  assert.ok(idea.sources.includes(wiki));
});
test("native research does not turn mixed excluded blocks into supported claims", () => {
  const output = extractResearchResult({
    stop_reason: "end_turn",
    content: [
      { type: "server_tool_use", name: "web_search" },
      {
        type: "text",
        text: "A mixed research interpretation.",
        citations: [
          {
            type: "web_search_result_location",
            url: wiki,
            title: "Wikipedia",
            cited_text: "Retained excerpt.",
          },
          {
            type: "web_search_result_location",
            url: allowed,
            title: "Original",
            cited_text: "Original excerpt.",
          },
        ],
      },
    ],
  });
  assert.deepEqual(
    output.citations.map((c) => c.url),
    [allowed],
  );
  assert.equal(output.claims.length, 0);
  assert.match(output.summary, /Excluded/);
});
test("excluded generated sources remain retained outcomes rather than new idea cards or applied writing", () => {
  assert.throws(
    () =>
      parseGeneratedIdeas(
        JSON.stringify({
          ideas: [
            {
              title: "Household routine",
              brief: "A practical household angle.",
              audience: "Owners",
              format: "Text post",
              sources: [wiki],
            },
          ],
        }),
      ),
    /excluded Wikipedia/,
  );
  const s = initialState(DEMO_ACTOR, true),
    d = s.contents[0];
  d.state = "draft";
  d.format = "Text post";
  d.copyAcceptances = [];
  const before = d.text,
    j = {
      id: "bad-candidate",
      kind: "text",
      contentId: d.id,
      channel: d.channel,
      account: d.account,
      createdBy: DEMO_ACTOR.email,
      outputContract: "draft_v1",
      targetRevision: d.revision,
      targetIdentity: copyIdentity(d, s),
      targetAccepted: false,
    } as Job;
  settleWrittenOutput(
    s,
    j,
    {
      completion: "complete",
      text: JSON.stringify({
        body: "A new candidate that must not replace the saved wording.",
        metadata: "",
        sources: [wiki],
        questions: [],
      }),
    },
    new Date().toISOString(),
  );
  assert.equal(j.outputStatus, "invalid");
  assert.equal(d.text, before);
});
test("legacy queued supporting sources are detected without banning a human draft that asks AI to remove them", () => {
  assert.equal(
    jobHasExcludedSupport({
      kind: "text",
      prompt: JSON.stringify({ webEvidence: [{ citations: [{ url: wiki }] }] }),
    } as Job),
    true,
  );
  assert.equal(
    jobHasExcludedSupport({
      kind: "text",
      prompt: JSON.stringify({
        currentCopy: "Remove the old citation " + wiki,
        webEvidence: [],
      }),
    } as Job),
    false,
  );
  assert.equal(
    jobHasExcludedSupport({ kind: "research", prompt: "Read " + wiki } as Job),
    true,
  );
});
