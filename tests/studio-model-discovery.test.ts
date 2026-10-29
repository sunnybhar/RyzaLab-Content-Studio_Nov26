import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverModels } from "../lib/studio/model-discovery";
test("account discovery follows fixed-origin pagination and keeps exact model IDs", async () => {
  const urls: string[] = [];
  const models = await discoverModels("anthropic", "private-key", (async (
    url: string,
    init: RequestInit,
  ) => {
    urls.push(url);
    assert.equal(init.redirect, "error");
    assert.equal(new URL(url).origin, "https://api.anthropic.com");
    return Response.json(
      urls.length === 1
        ? { data: [{ id: "model-one" }], has_more: true, last_id: "cursor/a?b" }
        : { data: [{ id: "model-two" }], has_more: false },
    );
  }) as typeof fetch);
  assert.deepEqual(models, ["model-one", "model-two"]);
  assert.equal(new URL(urls[1]).searchParams.get("after_id"), "cursor/a?b");
});
test("Google pagination normalizes its model prefix and deduplicates", async () => {
  let calls = 0;
  const models = await discoverModels("google", "private-key", (async () =>
    Response.json(
      ++calls === 1
        ? { models: [{ name: "models/gemini-test" }], nextPageToken: "next" }
        : {
            models: [{ name: "models/gemini-test" }, { name: "models/second" }],
          },
    )) as typeof fetch);
  assert.deepEqual(models, ["gemini-test", "second"]);
});
test("provider errors and repeated cursors fail without exposing credentials or provider bodies", async () => {
  for (const request of [
    async () => Response.json({ error: "private-key" }, { status: 401 }),
    async () => Response.json({ data: [], has_more: true, last_id: "same" }),
  ]) {
    await assert.rejects(
      discoverModels("anthropic", "private-key", request as typeof fetch),
      (error: Error) =>
        !error.message.includes("private-key") &&
        /Could not list/.test(error.message),
    );
  }
});
