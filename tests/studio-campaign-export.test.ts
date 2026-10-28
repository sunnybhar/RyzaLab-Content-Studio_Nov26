import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import {
  buildCampaignArchive,
  campaignInventory,
  campaignSelection,
} from "../lib/studio/campaign-export";
import type { Package } from "../lib/studio/types";
const options = {
  channel: "All channels" as const,
  includeDrafts: true,
  allVersions: false,
};
function fixture() {
  const s = initialState(DEMO_ACTOR, true);
  const c = s.contents[0];
  c.title = '=IMPORTXML("https://invalid.example")';
  c.collection = "Campaign A";
  c.media = structuredClone(EMPTY_MEDIA);
  c.text = "Working copy changed after approval";
  const p: Package = {
    id: "../unsafe-id",
    contentId: c.id,
    channel: c.channel,
    account: c.account,
    title: "Approved exact title",
    revision: 1,
    textRevision: 1,
    mediaRevision: 1,
    text: "Approved exact text",
    metadata: "approved metadata",
    media: structuredClone(EMPTY_MEDIA),
    ruleVersion: s.settings.protectedVersion,
    approvedBy: DEMO_ACTOR.email,
    approvedAt: "2026-10-28T12:00:00Z",
    hash: "approved-hash",
  };
  s.packages.push(p);
  return s;
}
test("campaign archive preserves approved snapshots, inventory and clearly labelled independent working copies", async () => {
  const s = fixture();
  const archive = await buildCampaignArchive(s, DEMO_ACTOR, options);
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  assert.equal(manifest.approvedPackages[0].packageId, "../unsafe-id");
  assert.equal(manifest.approvedPackages[0].approvalHash, "approved-hash");
  assert.match(manifest.approvedPackages[0].sha256, /^[0-9a-f]{64}$/);
  const pkgBytes = await zip
    .file(manifest.approvedPackages[0].file)!
    .async("uint8array");
  const pkg = await JSZip.loadAsync(pkgBytes);
  assert.match(
    await pkg.file("content.txt")!.async("string"),
    /Approved exact text/,
  );
  const working = JSON.parse(
    await zip.file("working/draft-001.json")!.async("string"),
  );
  assert.equal(working.status, "UNAPPROVED_WORKING_COPY");
  assert.equal(working.text, "Working copy changed after approval");
  assert.equal(zip.file("connections.json"), null);
  assert.ok(!Object.keys(zip.files).some((p) => p.includes("../")));
});
test("inventory defuses spreadsheet formulas and respects collection/channel/export scope", () => {
  const s = fixture();
  const csv = campaignInventory(s, DEMO_ACTOR, options);
  assert.ok(csv.includes("'=IMPORTXML"));
  assert.equal(
    campaignSelection(s, DEMO_ACTOR, { ...options, collection: "Other" })
      .contents.length,
    0,
  );
  const actor = { id: "limited", email: "limited@example.com" };
  s.members.push({
    ...actor,
    roles: ["viewer"],
    grants: [{ action: "read", channel: "LinkedIn" }],
    revoked: false,
  });
  assert.equal(campaignSelection(s, actor, options).contents.length, 0);
});
test("historical approved package needed by a publication task stays in bundle even with latest-only selection", () => {
  const s = fixture();
  s.packages.unshift({ ...s.packages[0], id: "new-version", revision: 2 });
  s.schedules.push({
    id: "published-old",
    contentId: s.contents[0].id,
    packageId: s.packages[1].id,
    state: "published",
    at: "2026-10-28T13:00:00Z",
    owner: DEMO_ACTOR.email,
  });
  assert.equal(campaignSelection(s, DEMO_ACTOR, options).packages.length, 2);
});
