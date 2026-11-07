import { test } from "node:test";
import assert from "node:assert/strict";
import { runProvider, ProviderFailure } from "../lib/studio/providers";
import type { Job, Connection } from "../lib/studio/types";
const connection = {
  provider: "openai",
  model: "gpt-image-1",
  function: "image",
} as Connection;
const job = {
  kind: "image",
  prompt: "A conceptual room, no real installation claims.",
  systemSnapshot: "Frozen safe guidance",
  pricingSnapshot: { maxOutputTokens: 100 },
} as unknown as Job;
test("image adapter sends one fixed-size medium GPT Image request and retains PNG bytes", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/images/generations");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.n, 1);
    assert.equal(body.size, "1024x1024");
    assert.equal(body.quality, "medium");
    return Response.json({
      data: [
        {
          b64_json:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        },
      ],
    });
  }) as typeof fetch;
  try {
    const result = await runProvider(job, connection, "fixture-only");
    assert.equal(result.mime, "image/png");
    assert.ok(result.bytes!.length > 8);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous;
  }
});
test("unsupported image models fail before disclosure and malformed successful payloads remain uncertain", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return Response.json({ data: [{ b64_json: "bm90LWFuLWltYWdl" }] });
  }) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        runProvider(
          job,
          { ...connection, model: "text-only-model" },
          "fixture-only",
        ),
      (e: unknown) => e instanceof ProviderFailure && !e.ambiguous,
    );
    assert.equal(calls, 0);
    await assert.rejects(
      () => runProvider(job, connection, "fixture-only"),
      (e: unknown) => e instanceof ProviderFailure && e.ambiguous,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous;
  }
});
