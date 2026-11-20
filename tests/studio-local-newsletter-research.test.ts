import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { localAI } from "../lib/studio/local-ai";
import { DEMO_ACTOR, initialState } from "../lib/studio/seed";

test("newsletter writing searches online even with linked copy and refuses to use brand articles as its only evidence", async () => {
  const db = new DatabaseSync(":memory:");
  const previousFetch = globalThis.fetch;
  try {
    db.exec("CREATE TABLE workspace(id INTEGER PRIMARY KEY, revision INTEGER, state TEXT)");
    const state = initialState(DEMO_ACTOR, true);
    const original = state.contents[0];
    const draft = {
      ...original, id: "newsletter", channel: "Newsletter" as const, format: "Newsletter",
      title: "Smart thermostat manual fallback", state: "draft" as const,
      newsletterSource: {
        kind: "content" as const, id: original.id, channel: original.channel,
        title: original.title, text: "Saved house article", metadata: "https://ryzalab.com/notes/house",
        revision: original.revision, capturedAt: original.updatedAt,
      },
    };
    state.contents.unshift(draft);
    state.settings.defaultConnections = { text: "writer" };
    state.connections = [{ id: "writer", provider: "openai", model: "gpt-6.2-astra", function: "text",
      title: "Writing fixture", hasKey: true, status: "validated", updatedAt: original.updatedAt }];
    db.prepare("INSERT INTO workspace VALUES (1,1,?)").run(JSON.stringify(state));
    const requests: string[] = [];
    globalThis.fetch = async (request) => {
      requests.push(String(request));
      return new Response(null, { status: 503 });
    };
    await assert.rejects(() => localAI((work) => work(db), 1, {
      type: "content.generate", kind: "text", contentId: draft.id, expectedRevision: draft.revision,
      idempotencyKey: crypto.randomUUID(), publicQuery: "",
    }), /no usable independent sources.*No paid writing request/);
    assert.ok(requests.length > 0);
    assert.ok(requests.every((request) => !request.includes("api.openai.com") && !request.includes("ryzalab.com")));
    assert.equal(db.prepare("SELECT revision FROM workspace").get()?.revision, 1);
  } finally {
    globalThis.fetch = previousFetch;
    db.close();
  }
});
