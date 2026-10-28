import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
import { syncGoogleText } from "../lib/studio/docs-sync";
import { applyCommand } from "../lib/studio/engine";
import { completeChecks } from "./stage-fixture";
import { googleDocumentText } from "../lib/studio/google";
const now = "2026-10-28T18:00:00Z";
function fixture() {
  const s = initialState(DEMO_ACTOR, true);
  const c = s.contents[0];
  c.text = "A written handoff records recovery steps.";
  c.docsBase = c.text;
  c.docId = "test-document";
  c.docsOwnerId = DEMO_ACTOR.id;
  c.docsOwnerEmail = DEMO_ACTOR.email;
  c.docsFetchedAt = "2026-10-28T12:00:00Z";
  return s;
}
test("automatic sync imports clean draft changes and preserves displaced text and media", () => {
  const s = fixture();
  const d = s.contents[0];
  const next = syncGoogleText(
    s,
    DEMO_ACTOR,
    d.id,
    d.revision,
    "Updated document text.",
    now,
  );
  assert.equal(next.contents[0].text, "Updated document text.");
  assert.equal(next.contents[0].history.at(-1)?.text, d.text);
  assert.deepEqual(next.contents[0].media, d.media);
  assert.equal(next.contents[0].revision, d.revision + 1);
  assert.equal(next.contents[0].docsIncoming, undefined);
});
test("concurrent Studio changes stay intact and incoming branches are retained across further conflicts", () => {
  const s = fixture();
  s.contents[0].text = "Independent Studio edit";
  let next = syncGoogleText(
    s,
    DEMO_ACTOR,
    s.contents[0].id,
    1,
    "External change one",
    now,
  );
  assert.equal(next.contents[0].text, "Independent Studio edit");
  assert.equal(next.contents[0].docsIncoming?.text, "External change one");
  next = syncGoogleText(
    next,
    DEMO_ACTOR,
    next.contents[0].id,
    1,
    "External change two",
    now,
  );
  assert.equal(next.contents[0].docsIncoming?.text, "External change two");
  assert.equal(next.contents[0].history.at(-1)?.text, "External change one");
  assert.equal(next.contents[0].revision, 1);
});
test("review and approved current versions hold external changes for human import", () => {
  let s = fixture();
  s = completeChecks(s, DEMO_ACTOR, s.contents[0].id, { demo: true });
  s = applyCommand(
    s,
    DEMO_ACTOR,
    {
      type: "package.approve",
      contentId: s.contents[0].id,
      expectedRevision: 1,
      expectedWorkflowId: "seed-linkedin",
      expectedRuleVersion: s.settings.protectedVersion,
    },
    { demo: true },
  );
  const packages = structuredClone(s.packages);
  const next = syncGoogleText(
    s,
    DEMO_ACTOR,
    s.contents[0].id,
    1,
    "External changed approved content",
    now,
  );
  assert.deepEqual(next.packages, packages);
  assert.equal(next.contents[0].text, s.contents[0].text);
  assert.match(next.contents[0].docsIncoming!.reason, /approved/);
});
test("revoked/stale/unbaselined Docs checks reject without data changes", () => {
  const s = fixture();
  assert.throws(
    () => syncGoogleText(s, DEMO_ACTOR, s.contents[0].id, 99, "External", now),
    /changed/,
  );
  s.members[0].revoked = true;
  assert.throws(
    () => syncGoogleText(s, DEMO_ACTOR, s.contents[0].id, 1, "External", now),
    /authority/,
  );
  s.members[0].revoked = false;
  s.contents[0].docsFetchedAt = undefined;
  assert.throws(
    () => syncGoogleText(s, DEMO_ACTOR, s.contents[0].id, 1, "External", now),
    /manually fetch/,
  );
});
test("Google tab extraction does not duplicate legacy body text and respects paragraph order", () => {
  const doc = {
    body: { content: [{ textRun: { content: "duplicate" } }] },
    tabs: [
      {
        documentTab: {
          body: {
            content: [
              {
                paragraph: {
                  elements: [
                    { textRun: { content: "First\n" } },
                    { textRun: { content: "Second\n" } },
                  ],
                },
              },
            ],
          },
        },
      },
    ],
  };
  assert.equal(googleDocumentText(doc), "First\nSecond\n");
});

test("manual import rejects a replaced conflict branch and retains displaced incoming versions", () => {
  const s = fixture();
  s.contents[0].text = "Studio branch";
  let next = syncGoogleText(
    s,
    DEMO_ACTOR,
    s.contents[0].id,
    1,
    "Incoming one",
    now,
  );
  next = syncGoogleText(
    next,
    DEMO_ACTOR,
    s.contents[0].id,
    1,
    "Incoming two",
    "2026-10-28T18:05:00Z",
  );
  assert.throws(
    () =>
      applyCommand(next, DEMO_ACTOR, {
        type: "docs.import",
        contentId: s.contents[0].id,
        expectedRevision: 1,
        expectedIncomingFetchedAt: now,
        text: "Incoming one",
      }),
    /Incoming Google Docs version changed/,
  );
  const imported = applyCommand(next, DEMO_ACTOR, {
    type: "docs.import",
    contentId: s.contents[0].id,
    expectedRevision: 1,
    text: "Human merged text",
  });
  assert.ok(
    imported.contents[0].history.some((h) => h.text === "Incoming two"),
  );
  assert.ok(
    imported.contents[0].history.some((h) => h.text === "Studio branch"),
  );
  assert.equal(imported.contents[0].docsIncoming, undefined);
});
