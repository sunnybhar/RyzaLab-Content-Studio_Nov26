import type { Content } from "./types";
import { StudioError } from "./permissions";
export interface AssetRecord {
  content_id: string;
  object_path: string;
  mime: string;
}
export interface StoredAssetInfo {
  contentType?: string;
  size?: number;
  version?: string;
  etag?: string;
}
export const studioAssetUrl = /^\/api\/studio\/assets\?id=([0-9a-f-]{36})$/i;
export const inlineMediaUrl = /^data:(image\/(png|jpeg|webp)|video\/mp4|audio\/(mpeg|wav));base64,/i;

export function approvalAssetUses(content: Content) {
  return [
    { url: content.media.imageUrl, kind: "image" },
    ...(content.media.sectionImages||[]).map(image=>({url:image.url,kind:"image"})),
    ...content.media.slides.map((s) => ({ url: s.image, kind: "image" })),
    ...content.media.scenes.flatMap((s) => [
      { url: s.sourceUrl, kind: "scene" },
      { url: s.audioUrl, kind: "audio" },
    ]),
  ].filter((use): use is { url: string; kind: string } => Boolean(use.url));
}
export function approvalMimeMatches(kind: string, mime: string) {
  const image = ["image/png", "image/jpeg", "image/webp"];
  if (kind === "audio") return ["audio/mpeg", "audio/wav"].includes(mime);
  return image.includes(mime) || (kind === "scene" && mime === "video/mp4");
}
export async function verifyApprovalAssets(
  content: Content,
  find: (id: string) => Promise<AssetRecord | null>,
  info: (path: string) => Promise<StoredAssetInfo | null>,
) {
  const uses = approvalAssetUses(content);
  const manifests: {
    id: string;
    path: string;
    mime: string;
    version?: string;
    etag?: string;
    size: number;
  }[] = [];
  for (const use of uses) {
    const id = studioAssetUrl.exec(use.url)?.[1];
    if (!id)
      throw new StudioError(400, "Upload immutable media before approval.");
    const asset = await find(id);
    if (!asset || asset.content_id !== content.id)
      throw new StudioError(
        403,
        "An approved asset must belong to this exact content item.",
      );
    const stored = await info(asset.object_path);
    if (!stored || !stored.size)
      throw new StudioError(
        400,
        "The media upload is incomplete or missing. Finish uploading before approval.",
      );
    if (
      stored.size > 50 * 1024 * 1024 ||
      !stored.contentType ||
      stored.contentType !== asset.mime
    )
      throw new StudioError(
        400,
        "Stored media size or type does not match the upload record.",
      );
    if (!approvalMimeMatches(use.kind, stored.contentType))
      throw new StudioError(
        400,
        "The uploaded media type does not match its use in this package.",
      );
    manifests.push({
      id,
      path: asset.object_path,
      mime: stored.contentType,
      size: stored.size,
      version: stored.version,
      etag: stored.etag,
    });
  }
  return manifests;
}
