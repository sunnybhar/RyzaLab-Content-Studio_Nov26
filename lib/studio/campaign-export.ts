import type { Actor, Channel, StudioState } from "./types";
import { can } from "./permissions";
import { buildPostPackage, serializeProject } from "./exports";
export type CampaignExportOptions = {
  channel: Channel | "All channels";
  collection?: string;
  includeDrafts: boolean;
  allVersions: boolean;
};
function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function campaignSelection(
  state: StudioState,
  actor: Actor,
  options: CampaignExportOptions,
) {
  const contents = state.contents.filter(
    (c) =>
      !c.deletedAt &&
      (options.channel === "All channels" || c.channel === options.channel) &&
      (!options.collection || c.collection === options.collection) &&
      can(state, actor, "read", {
        channel: c.channel,
        contentId: c.id,
        account: c.account,
        assignedTo: c.assignedTo,
      }) &&
      can(state, actor, "export", {
        channel: c.channel,
        contentId: c.id,
        account: c.account,
        assignedTo: c.assignedTo,
      }),
  );
  const ids = new Set(contents.map((c) => c.id));
  const scheduledPackageIds = new Set(
    state.schedules.filter((t) => ids.has(t.contentId)).map((t) => t.packageId),
  );
  const found = new Set<string>();
  const packages = state.packages.filter((p) => {
    if (!ids.has(p.contentId)) return false;
    if (
      !options.allVersions &&
      found.has(p.contentId) &&
      !scheduledPackageIds.has(p.id)
    )
      return false;
    found.add(p.contentId);
    return true;
  });
  return {
    contents,
    packages,
    schedules: state.schedules.filter((s) => ids.has(s.contentId)),
    tasks: (state.planningTasks || []).filter(
      (t) => t.contentId && ids.has(t.contentId),
    ),
  };
}
export function campaignInventory(
  state: StudioState,
  actor: Actor,
  options: CampaignExportOptions,
) {
  const selection = campaignSelection(state, actor, options);
  const rows = [
    [
      "Content ID",
      "Title",
      "Channel",
      "Campaign / collection",
      "Working revision",
      "Working status",
      "Latest approval ID",
      "Approved revision",
      "Publication records",
      "Assignee",
      "Updated at",
    ],
    ...selection.contents.map((c) => {
      const p = selection.packages.find((p) => p.contentId === c.id);
      return [
        c.id,
        c.title,
        c.channel,
        c.collection || "",
        c.revision,
        c.state,
        p?.id || "",
        p?.revision || "",
        selection.schedules.filter(
          (s) => s.contentId === c.id && s.state === "published",
        ).length,
        c.assignedTo,
        c.updatedAt,
      ];
    }),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export async function buildCampaignArchive(
  state: StudioState,
  actor: Actor,
  options: CampaignExportOptions,
): Promise<Blob> {
  const selection = campaignSelection(state, actor, options);
  if (!selection.contents.length)
    throw new Error("No readable/exportable content matches this selection.");
  if (selection.packages.length > 100 || selection.contents.length > 200)
    throw new Error(
      "Export limit reached. Select a smaller campaign or channel.",
    );
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const files: {
    packageId: string;
    contentId: string;
    revision: number;
    approvalHash: string;
    file: string;
    sha256: string;
  }[] = [];
  let bytes = 0;
  for (const [index, pkg] of selection.packages.entries()) {
    const data = await (await buildPostPackage(pkg)).arrayBuffer();
    bytes += data.byteLength;
    if (bytes > 200 * 1024 * 1024)
      throw new Error(
        "Campaign assets exceed the 200 MB browser export limit. Split the export.",
      );
    const file = `approved/package-${String(index + 1).padStart(3, "0")}.zip`;
    zip.file(file, data);
    const digest = await crypto.subtle.digest("SHA-256", data);
    files.push({
      packageId: pkg.id,
      contentId: pkg.contentId,
      revision: pkg.revision,
      approvalHash: pkg.hash,
      file,
      sha256: [...new Uint8Array(digest)]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join(""),
    });
  }
  if (options.includeDrafts)
    for (const [index, c] of selection.contents.entries()) {
      const prefix = `working/draft-${String(index + 1).padStart(3, "0")}`;
      const draft = {
        id: c.id,
        channel: c.channel,
        title: c.title,
        revision: c.revision,
        text: c.text,
        metadata: c.metadata,
        format: c.format,
        collection: c.collection,
        media: c.media,
        updatedAt: c.updatedAt,
        status: "UNAPPROVED_WORKING_COPY",
      };
      const json = JSON.stringify(draft, null, 2);
      bytes += new TextEncoder().encode(json).length;
      if (bytes > 200 * 1024 * 1024)
        throw new Error(
          "Working source data exceeds the export limit. Split the export.",
        );
      zip.file(prefix + ".json", json);
      zip.file(
        prefix + ".txt",
        `UNAPPROVED WORKING COPY\n${c.title}\nRevision ${c.revision}\n\n${c.text}`,
      );
      zip.file(prefix + "-media-source.json", serializeProject(c.media));
    }
  zip.file("inventory.csv", campaignInventory(state, actor, options));
  zip.file(
    "publication-tasks.json",
    JSON.stringify(selection.schedules, null, 2),
  );
  zip.file("work-tasks.json", JSON.stringify(selection.tasks, null, 2));
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        actor: actor.email,
        scope: options,
        contentIds: selection.contents.map((c) => c.id),
        approvedPackages: files,
        workingCopiesIncluded: options.includeDrafts,
      },
      null,
      2,
    ),
  );
  zip.file(
    "README.txt",
    "RyzaLab campaign export. Approved package ZIPs preserve exact release snapshots and include supported assets/source. Manifest SHA-256 values identify included ZIP bytes; approval hashes identify Studio release snapshots. Working copies are unapproved and never substitute for release packages. No provider credentials, connection secrets, or inferred social metrics are included. Human-confirmed publication records are not independent platform verification. Video source assets are not automatically rendered final MP4s.",
  );
  return zip.generateAsync({ type: "blob" });
}
export async function downloadCampaignArchive(
  state: StudioState,
  actor: Actor,
  options: CampaignExportOptions,
) {
  const blob = await buildCampaignArchive(state, actor, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ryzalab-campaign-export.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
