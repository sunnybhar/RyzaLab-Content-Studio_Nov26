import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyApprovalAssets } from "../lib/studio/assets";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const id = "11111111-1111-4111-8111-111111111111";
function fixture() {
  const c = initialState(DEMO_ACTOR, true).contents[0];
  c.media.slides[0].image = `/api/studio/assets?id=${id}`;
  return c;
}
test("signed-upload metadata without an uploaded object cannot become approved media", async () => {
  const c = fixture();
  await assert.rejects(
    () =>
      verifyApprovalAssets(
        c,
        async () => ({
          content_id: c.id,
          object_path: "object",
          mime: "image/png",
        }),
        async () => null,
      ),
    /incomplete|missing/,
  );
});
test("approved media captures durable object version and rejects unrelated objects or wrong MIME", async () => {
  const c = fixture(),
    asset = { content_id: c.id, object_path: "object", mime: "image/png" },
    info = {
      contentType: "image/png",
      size: 128,
      version: "immutable-v1",
      etag: "sha",
    };
  const result = await verifyApprovalAssets(
    c,
    async () => asset,
    async () => info,
  );
  assert.equal(result[0].version, "immutable-v1");
  await assert.rejects(
    () =>
      verifyApprovalAssets(
        c,
        async () => ({ ...asset, content_id: "other" }),
        async () => info,
      ),
    /exact content/,
  );
  await assert.rejects(
    () =>
      verifyApprovalAssets(
        c,
        async () => asset,
        async () => ({ ...info, contentType: "text/html" }),
      ),
    /type/,
  );
});
