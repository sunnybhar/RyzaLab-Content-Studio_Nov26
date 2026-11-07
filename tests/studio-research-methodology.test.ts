import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { applyCommand } from "../lib/studio/engine";
import { researchMethodology } from "../lib/studio/research-methodology";
import {
  researchProfile,
  researchQueries,
  researchProfileSchema,
} from "../lib/studio/research-profile";
import { retrieveBroadReferences } from "../lib/studio/web-discovery";
import { publicRetrievalTarget } from "../lib/studio/research-link";
test("private research instructions are versioned analysis guidance, never public query text", () => {
  let s = initialState(DEMO_ACTOR, true);
  const instructions =
    "Private: compare specialist standards and disconfirming evidence.";
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "agentRules.save",
      channel: "LinkedIn",
      slot: "research_instructions",
      fileName: "research.md",
      base64: Buffer.from(instructions).toString("base64"),
      byteSize: Buffer.byteLength(instructions),
      extractedText: instructions,
    },
    { demo: true },
  );
  const guidance = researchMethodology(s, "LinkedIn");
  assert.equal(guidance.instructions, instructions);
  assert.ok(guidance.resourceVersion?.id);
  const queries = researchQueries(
    "household handoff",
    researchProfile(s, "LinkedIn"),
  );
  assert.ok(!JSON.stringify(queries).includes("Private"));
  assert.match(guidance.baseline, /denominators/);
});
test("explicit article links are read and included only when actual page text is available", async () => {
  const requested: string[] = [];
  const request = (async () =>
    new Response("<rss><channel></channel></rss>", {
      headers: { "content-type": "application/xml" },
    })) as typeof fetch;
  const result = await retrieveBroadReferences(
    "home automation handoff",
    request,
    "2026-11-07T12:00:00Z",
    researchProfileSchema.parse({}),
    ["https://standards.example.org/home"],
    async (url) => {
      requested.push(url);
      return {
        url,
        title: "Home automation handoff evidence",
        text: "A supplied original technical passage about household control and clear handoff documentation. ".repeat(
          4,
        ),
        publishedAt: "2026-10-01",
        author: "Standards editor",
        bytes: 500,
        requests: 1,
        sourceKind: "article_text",
      };
    },
  );
  assert.deepEqual(requested, ["https://standards.example.org/home"]);
  assert.equal(result.citations[0].sourceKind, "article_text");
  assert.equal(result.citations[0].author, "Standards editor");
  assert.match(result.citations[0].accessNote!, /not independent verification/);
});
test("Wikipedia and private literal direct links fail before any public discovery request", async () => {
  let requests = 0;
  const fetcher = (async () => {
    requests++;
    throw Error("must not execute");
  }) as typeof fetch;
  for (const url of [
    "https://en.wikipedia.org/wiki/Home_automation",
    "https://127.0.0.1/private",
    "https://user:secret@example.org/article",
  ])
    await assert.rejects(() =>
      retrieveBroadReferences(
        "household handoff",
        fetcher,
        undefined,
        undefined,
        [url],
      ),
    );
  assert.equal(requests, 0);
});
test("same-key public research cannot replay a different supplied link list", () => {
  const s = initialState(DEMO_ACTOR, true);
  s.jobs = [
    {
      id: "saved-source",
      createdBy: DEMO_ACTOR.email,
      idempotencyKey: "source-key",
      connectionId: "public-reference-retrieval",
      channel: "LinkedIn",
      prompt: "household handoff",
      researchSourceUrls: ["https://example.org/first"],
    } as any,
  ];
  assert.throws(
    () =>
      publicRetrievalTarget(s, DEMO_ACTOR, {
        channel: "LinkedIn",
        query: "household handoff",
        idempotencyKey: "source-key",
        sourceUrls: ["https://example.org/second"],
      }),
    /different operation/,
  );
  assert.equal(
    publicRetrievalTarget(s, DEMO_ACTOR, {
      channel: "LinkedIn",
      query: "household handoff",
      idempotencyKey: "source-key",
      sourceUrls: ["https://example.org/first"],
    }).existing?.id,
    "saved-source",
  );
});
