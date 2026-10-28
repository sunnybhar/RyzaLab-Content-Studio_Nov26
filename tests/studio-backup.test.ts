import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { initialState, DEMO_ACTOR } from "../lib/studio/seed";
const backupPath = new URL("../scripts/studio-backup.mjs", import.meta.url)
  .href;
const drillPath = new URL(
  "../scripts/studio-restore-drill.mjs",
  import.meta.url,
).href;
const password = "Local test passphrase only 2026";
function snapshot() {
  const state = initialState(DEMO_ACTOR, true);
  state.contents[0].title = "Private app backup fixture";
  state.audit.push({
    id: "event1",
    actor: DEMO_ACTOR.email,
    action: "test.backup",
    target: "workspace",
    at: "2026-10-28T12:00:00Z",
  });
  return {
    state,
    releases: [],
    audit: state.audit.map((a) => ({ id: a.id, payload: a })),
    secrets: [
      { id: "encrypted-test", ciphertext: "opaque-credential-ciphertext-only" },
    ],
    assets: [
      {
        metadata: {
          id: "11111111-1111-4111-8111-111111111111",
          content_id: state.contents[0].id,
          object_path: "private/asset",
          uploaded_by: "22222222-2222-4222-8222-222222222222",
          mime: "image/png",
          name: "test-image",
        },
        bytes: Buffer.from("private-asset-fixture"),
      },
    ],
  };
}
test("encrypted app backup verifies state/evidence/assets and local SQL restore drill without remote calls", async () => {
  const {
    buildBackupArchive,
    verifyBackupArchive,
    encryptArchive,
    decryptArchive,
  } = await import(backupPath);
  const { restoreDrill } = await import(drillPath);
  const original = snapshot();
  const archive = await buildBackupArchive(original);
  const encrypted = encryptArchive(archive, password);
  assert.equal(
    encrypted.includes(Buffer.from("Private app backup fixture")),
    false,
  );
  const restored = await verifyBackupArchive(
    decryptArchive(encrypted, password),
  );
  assert.deepEqual(restored.state, original.state);
  assert.deepEqual(restored.assets[0].bytes, original.assets[0].bytes);
  assert.ok(
    restored.manifest.exclusions.some((s: string) => s.includes("Auth")),
  );
  const result = await restoreDrill(restored);
  assert.deepEqual(result, { contents: 1, packages: 0, audit: 1, assets: 1 });
});
test("wrong passphrase, ciphertext tampering and private asset hash mismatch reject", async () => {
  const {
    buildBackupArchive,
    verifyBackupArchive,
    encryptArchive,
    decryptArchive,
  } = await import(backupPath);
  const archive = await buildBackupArchive(snapshot());
  const encrypted = encryptArchive(archive, password);
  assert.throws(
    () => decryptArchive(encrypted, "wrong password value"),
    /authentication failed/,
  );
  const changed = Buffer.from(encrypted);
  changed[changed.length - 1] ^= 1;
  assert.throws(
    () => decryptArchive(changed, password),
    /authentication failed/,
  );
  const zip = await JSZip.loadAsync(archive);
  zip.file("assets/asset-00001.bin", "corrupted");
  const rebuilt = await zip.generateAsync({ type: "nodebuffer" });
  await assert.rejects(() => verifyBackupArchive(rebuilt), /integrity failed/);
});
test("mismatched immutable evidence and missing referenced assets never become successful backups", async () => {
  const { buildBackupArchive } = await import(backupPath);
  const bad = snapshot();
  bad.audit = [];
  await assert.rejects(() => buildBackupArchive(bad), /Immutable evidence/);
  const missing = snapshot();
  missing.state.contents[0].media.imageUrl =
    "/api/studio/assets?id=33333333-3333-4333-8333-333333333333";
  await assert.rejects(
    () => buildBackupArchive(missing),
    /referenced Studio asset/,
  );
});
