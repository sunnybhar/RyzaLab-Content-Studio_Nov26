// Trusted operator CLI. Never expose service credentials or this backup as a public route.
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import readline from "node:readline";
const LIMIT = 200 * 1024 * 1024;
const hash = (data) => createHash("sha256").update(data).digest("hex");
export function encryptArchive(bytes, password) {
  if (password.length < 12)
    throw new Error("Use a backup passphrase of at least 12 characters.");
  if (bytes.length > LIMIT)
    throw new Error("Backup exceeds the 200 MB local tool limit.");
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = scryptSync(password, salt, 32, {
      N: 32768,
      maxmem: 128 * 1024 * 1024,
    }),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([
    Buffer.from("RZLB1"),
    salt,
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
}
export function decryptArchive(bytes, password) {
  if (
    bytes.length > LIMIT + 49 ||
    bytes.length < 49 ||
    bytes.subarray(0, 5).toString() !== "RZLB1"
  )
    throw new Error("Unsupported or oversized backup.");
  const salt = bytes.subarray(5, 21),
    iv = bytes.subarray(21, 33),
    tag = bytes.subarray(33, 49),
    key = scryptSync(password, salt, 32, {
      N: 32768,
      maxmem: 128 * 1024 * 1024,
    }),
    decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([
      decipher.update(bytes.subarray(49)),
      decipher.final(),
    ]);
  } catch {
    throw new Error("Passphrase incorrect or backup authentication failed.");
  }
}
const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
export async function buildBackupArchive(snapshot) {
  const { state, releases, audit, assets, secrets } = snapshot;
  if (!state || !Array.isArray(state.packages) || !Array.isArray(state.audit))
    throw new Error("Missing canonical Studio state.");
  for (const [items, rows] of [
    [state.packages, releases],
    [state.audit, audit],
  ])
    for (const item of items) {
      const row = rows.find((r) => r.id === item.id);
      if (!row || canonical(row.payload) !== canonical(item))
        throw new Error(
          "Immutable evidence differs from canonical state. Retry a consistent read.",
        );
    }
  const assetIds = new Set(assets.map((a) => a.metadata.id));
  for (const match of JSON.stringify([
    ...state.contents.map((c) => c.media),
    ...state.packages.map((p) => p.media),
  ]).matchAll(/\/api\/studio\/assets\?id=([0-9a-f-]{36})/gi)) {
    if (!assetIds.has(match[1]))
      throw new Error("A referenced Studio asset is missing from this backup.");
  }
  const zip = new JSZip();
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    workspaceVersion: state.version,
    assets: [],
    exclusions: [
      "Supabase Auth passwords and provider accounts",
      "Database roles/settings and unused legacy import tables",
      "STUDIO_ENCRYPTION_KEY and other environment secrets",
    ],
    required:
      "Keep the original STUDIO_ENCRYPTION_KEY separately to recover encrypted provider/OAuth credentials. Auth identities need separate platform recovery.",
  };
  zip.file("state.json", JSON.stringify(state));
  zip.file("releases.json", JSON.stringify(releases));
  zip.file("audit.json", JSON.stringify(audit));
  zip.file("secrets.encrypted.json", JSON.stringify(secrets));
  let total = Buffer.byteLength(
    JSON.stringify({ state, releases, audit, secrets }),
  );
  for (const [index, asset] of assets.entries()) {
    const bytes = Buffer.from(asset.bytes);
    total += bytes.length;
    if (total > LIMIT)
      throw new Error(
        "Backup exceeds 200 MB local tool limit; use a platform-scale backup.",
      );
    const file = `assets/asset-${String(index + 1).padStart(5, "0")}.bin`;
    zip.file(file, bytes);
    manifest.assets.push({
      metadata: asset.metadata,
      file,
      bytes: bytes.length,
      sha256: hash(bytes),
    });
  }
  zip.file("manifest.json", JSON.stringify(manifest));
  const data = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  if (data.length > LIMIT) throw new Error("Backup too large.");
  return data;
}
export async function verifyBackupArchive(bytes) {
  if (bytes.length > LIMIT) throw new Error("Backup too large.");
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  let total = 0;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const size = entry._data?.uncompressedSize;
    if (!Number.isSafeInteger(size) || size < 0 || (total += size) > LIMIT)
      throw new Error("Uncompressed backup exceeds limits.");
  }
  const read = async (name) => {
    const file = zip.file(name);
    if (!file) throw new Error(`Missing backup entry ${name}`);
    return JSON.parse(await file.async("string"));
  };
  const manifest = await read("manifest.json");
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.length > 5000
  )
    throw new Error("Unsupported manifest.");
  const state = await read("state.json"),
    releases = await read("releases.json"),
    audit = await read("audit.json"),
    secrets = await read("secrets.encrypted.json");
  if (
    !Array.isArray(state.members) ||
    !Array.isArray(state.contents) ||
    !Array.isArray(state.packages) ||
    !Array.isArray(state.audit) ||
    !Number.isInteger(state.version)
  )
    throw new Error("Invalid state.");
  for (const [items, rows] of [
    [state.packages, releases],
    [state.audit, audit],
  ])
    for (const item of items) {
      const row = rows.find((r) => r.id === item.id);
      if (!row || canonical(row.payload) !== canonical(item))
        throw new Error("Release/audit consistency failed.");
    }
  const assets = [];
  for (const item of manifest.assets) {
    if (!/^assets\/asset-\d{5}\.bin$/.test(item.file))
      throw new Error("Unsafe archive asset path.");
    const file = zip.file(item.file);
    if (!file) throw new Error("Missing private asset.");
    const data = await file.async("nodebuffer");
    if (data.length !== item.bytes || hash(data) !== item.sha256)
      throw new Error("Private asset integrity failed.");
    assets.push({ metadata: item.metadata, bytes: data });
  }
  return { manifest, state, releases, audit, secrets, assets };
}
export async function hiddenBackupPassword(prompt) {
  if (!process.stdin.isTTY)
    throw new Error(
      "Use an interactive terminal; never put a passphrase on the command line.",
    );
  process.stdout.write(prompt);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    function finish() {
      process.stdin.removeListener("keypress", keypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    }
    function keypress(text, key) {
      if (key?.ctrl && key.name === "c") {
        finish();
        reject(new Error("Cancelled."));
      } else if (key?.name === "return") {
        finish();
        resolve(value);
      } else if (key?.name === "backspace") value = value.slice(0, -1);
      else if (text && !key?.ctrl && !key?.meta && !text.includes("\u001b"))
        value += text;
    }
    process.stdin.on("keypress", keypress);
  });
}
async function readRows(db, table) {
  let rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + 999);
    if (error)
      throw new Error(`Cannot read ${table}; check operator permissions.`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
export async function captureBackup(db) {
  const before = await db
    .from("studio_workspace")
    .select("state,version")
    .eq("id", true)
    .single();
  if (before.error) throw new Error("Cannot read initialized Studio.");
  const state = before.data.state;
  const [allReleases, allAudit, metadata, secrets] = await Promise.all(
    [
      "studio_release_packages",
      "studio_audit",
      "studio_assets",
      "studio_secrets",
    ].map((table) => readRows(db, table)),
  );
  const assets = [];
  let total = 0;
  for (const row of metadata) {
    const result = await db.storage
      .from("studio-assets")
      .download(row.object_path);
    if (result.error)
      throw new Error(
        "A retained asset could not be downloaded; no incomplete backup saved.",
      );
    const bytes = Buffer.from(await result.data.arrayBuffer());
    total += bytes.length;
    if (total > LIMIT) throw new Error("Assets exceed local tool limit.");
    assets.push({ metadata: row, bytes });
  }
  const after = await db
    .from("studio_workspace")
    .select("version")
    .eq("id", true)
    .single();
  if (after.error || after.data.version !== before.data.version)
    throw new Error(
      "Workspace changed during backup. Retry after edits/jobs settle.",
    );
  const packageIds = new Set(state.packages.map((p) => p.id)),
    auditIds = new Set(state.audit.map((a) => a.id));
  return {
    state,
    releases: allReleases.filter((r) => packageIds.has(r.id)),
    audit: allAudit.filter((r) => auditIds.has(r.id)),
    assets,
    secrets,
  };
}
async function main() {
  const verify = process.argv[2] === "verify";
  if (verify) {
    const file = process.argv[3];
    if (!file)
      throw new Error(
        "Usage: node scripts/studio-backup.mjs verify /private/file.rzlbackup",
      );
    if ((await stat(file)).size > LIMIT + 49)
      throw new Error("Backup exceeds limit.");
    const password = await hiddenBackupPassword("Backup passphrase (hidden): ");
    const snapshot = await verifyBackupArchive(
      decryptArchive(await readFile(file), password),
    );
    console.log(
      `Verified app backup: ${snapshot.state.contents.length} content items, ${snapshot.state.packages.length} approvals, ${snapshot.assets.length} private assets. Auth/environment recovery remains separate.`,
    );
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Set trusted local Supabase URL/service role environment. Never paste keys into command arguments.",
    );
  const password = await hiddenBackupPassword(
    "New backup passphrase, 12+ characters (hidden): ",
  );
  if (
    password !== (await hiddenBackupPassword("Confirm passphrase (hidden): "))
  )
    throw new Error("Passphrases differ.");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const snapshot = await captureBackup(db);
  const plain = await buildBackupArchive(snapshot);
  await verifyBackupArchive(plain);
  const encrypted = encryptArchive(plain, password);
  const directory = join(homedir(), "RyzaLab-Backups");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = join(
    directory,
    `studio-${new Date().toISOString().replaceAll(":", "-")}.rzlbackup`,
  );
  await writeFile(file, encrypted, { mode: 0o600, flag: "wx" });
  console.log(
    `Encrypted app backup saved: ${file}. Preserve passphrase and original Studio encryption key separately. Auth/project recovery remains separate.`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch(() => {
    console.error(
      "Backup/verification failed. Check credentials, consistency, passphrase and permissions. No production write or restore was performed.",
    );
    process.exitCode = 1;
  });
