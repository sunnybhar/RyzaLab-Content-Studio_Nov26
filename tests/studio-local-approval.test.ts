import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { localAI } from "../lib/studio/local-ai";
import { DEMO_ACTOR, initialState } from "../lib/studio/seed";

test("local approval verifies saved media and rejects missing, mismatched or external attachments even with an override", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`
      CREATE TABLE workspace(id INTEGER PRIMARY KEY, revision INTEGER, state TEXT);
      CREATE TABLE local_media(id TEXT PRIMARY KEY, mime TEXT, bytes BLOB);
    `);
    const state = initialState(DEMO_ACTOR, true);
    const draft = state.contents[0];
    draft.state = "review";
    draft.text = "A useful handoff explains account access and recovery.";
    const id = "60f31e14-b946-44a4-8c44-75056cb0c471";
    const url = `/api/studio/local?media=${id}`;
    const command = {
      type: "package.approve",
      contentId: draft.id,
      expectedRevision: draft.revision,
      expectedWorkflowId: "seed-linkedin",
      expectedRuleVersion: state.settings.protectedVersion,
      singleReview: true,
      handoff: true,
      overrideReason: "Founder review recorded.",
    };
    const save = (imageUrl: string) => {
      draft.media.imageUrl = imageUrl;
      db.prepare("INSERT OR REPLACE INTO workspace VALUES (1, 1, ?)").run(JSON.stringify(state));
    };
    const approve = () => localAI((work) => work(db), 1, command);
    save("https://example.com/mutable-image.png");
    await assert.rejects(approve, /external media attachment/);
    save(url);
    await assert.rejects(approve, /missing or has the wrong type/);
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    db.prepare("INSERT INTO local_media VALUES (?, 'video/mp4', ?)").run(id, bytes);
    await assert.rejects(approve, /missing or has the wrong type/);
    assert.equal(db.prepare("SELECT revision FROM workspace").get()?.revision, 1);

    db.prepare("UPDATE local_media SET mime = 'image/png' WHERE id = ?").run(id);
    const result = await approve();
    assert.ok("state" in result && result.state);
    assert.equal(result.revision, 2);
    const approved = result.state.packages.find((item) => item.contentId === draft.id);
    assert.equal(approved?.media.imageUrl, url);
    assert.deepEqual((approved as { assetManifest?: unknown } | undefined)?.assetManifest, [{
      id, path: url, mime: "image/png", size: bytes.length,
      etag: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
    }]);
  } finally {
    db.close();
  }
});
