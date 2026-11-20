import assert from "node:assert/strict";
import { test } from "node:test";
import { channelWritingContract, writingWordCount, writingWordTarget } from "../lib/studio/channel-writing";

test("LinkedIn articles and newsletters have distinct word targets while LinkedIn posts keep their existing target", () => {
  assert.match(channelWritingContract("LinkedIn", '{"format":"Text post"}'), /180–250 words/);
  assert.match(channelWritingContract("LinkedIn", '{"format":"Article"}'), /800–1,200 words/);
  assert.deepEqual(writingWordTarget("LinkedIn", "Article"), { label: "LinkedIn article", min: 800, max: 1200 });
  const newsletter = channelWritingContract("Newsletter", JSON.stringify({ format: "Newsletter", newsletterTemplate: { sections: [], guidance: "About 500 words" } }));
  assert.match(newsletter, /1,600–3,000 words/);
  assert.match(newsletter, /takes precedence over the template/);
  assert.equal(writingWordCount("## Takeaway\nOne useful decision.\n\n## Sources\n- https://example.org/article"), 4);
});
