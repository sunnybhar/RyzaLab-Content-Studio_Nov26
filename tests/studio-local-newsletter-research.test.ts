import assert from "node:assert/strict";
import { createCipheriv } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { localAI } from "../lib/studio/local-ai";
import { DEMO_ACTOR, initialState } from "../lib/studio/seed";

test("newsletter writing searches online even with linked copy and can write a provisional draft without citing brand articles", async () => {
  const db = new DatabaseSync(":memory:");
  const previousFetch = globalThis.fetch;
  const cwd = process.cwd();
  const fixtureDir = mkdtempSync(join(tmpdir(), "studio-writing-"));
  try {
    process.chdir(fixtureDir);
    mkdirSync(".studio-local");
    const encryptionKey = Buffer.alloc(32);
    writeFileSync(".studio-local/credentials.key", encryptionKey);
    const iv = Buffer.alloc(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update("fixture-only"), cipher.final()]);
    db.exec(`
      CREATE TABLE workspace(id INTEGER PRIMARY KEY, revision INTEGER, state TEXT);
      CREATE TABLE credentials(id TEXT PRIMARY KEY, ciphertext TEXT);
    `);
    db.prepare("INSERT INTO credentials VALUES (?, ?)").run("writer",
      [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64")).join("."));
    const state = initialState(DEMO_ACTOR, true);
    const original = state.contents[0];
    const draft = {
      ...original, id: "newsletter", channel: "Newsletter" as const, format: "Newsletter",
      title: "Smart thermostat manual fallback", text: "", state: "draft" as const,
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
    globalThis.fetch = async (request, options) => {
      const url = String(request);
      requests.push(url);
      if (url !== "https://api.openai.com/v1/responses") return new Response(null, { status: 503 });
      const input = JSON.parse(JSON.parse(String(options?.body)).input);
      assert.match(input.evidenceScope, /Research found 0 usable public sources/);
      assert.deepEqual(input.newsletterSourceLinks, []);
      return Response.json({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: JSON.stringify({
          body: "Consider how you would adjust the temperature if the hub were offline. ".repeat(135).trim(),
          metadata: "", sources: [], questions: ["Which controls work offline?"],
        }) }] }],
        usage: { input_tokens: 1000, output_tokens: 1950 },
      });
    };
    const result = await localAI((work) => work(db), 1, {
      type: "content.generate", kind: "text", contentId: draft.id, expectedRevision: draft.revision,
      idempotencyKey: crypto.randomUUID(), publicQuery: "",
    });
    assert.ok("job" in result && result.job);
    assert.equal(result.job.state, "succeeded");
    assert.equal(result.job.researchSourceCount, 0);
    assert.ok(result.job.candidate?.questions.includes("Which controls work offline?"));
    assert.ok("state" in result && result.state.contents.find(content => content.id === draft.id)?.text.includes("hub were offline"));
    assert.ok(requests.some(request => !request.includes("api.openai.com")));
    assert.equal(requests.filter(request => request.includes("api.openai.com")).length, 1);
    assert.ok(requests.every(request => !request.includes("ryzalab.com")));
  } finally {
    globalThis.fetch = previousFetch;
    db.close();
    process.chdir(cwd);
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
