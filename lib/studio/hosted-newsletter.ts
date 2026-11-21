import { newsletterTemplateOutline, newsletterWritingGuidance } from "./newsletter-template";
import { canReadNewsletterSource } from "./newsletter-source";
import { requirePermission, StudioError } from "./permissions";
import type { database } from "./store";
import type { Actor, StudioState } from "./types";

export type StudioDatabase = ReturnType<typeof database>;
export const hostedNewsletterLimit = 4 * 1024 * 1024;
export const newsletterDocxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function newsletterDraft(state: StudioState, actor: Actor, id: string, action = "read") {
  const draft = state.contents.find(item => item.id === id && !item.deletedAt && item.channel === "Newsletter");
  if (!draft) throw new StudioError(404, "Newsletter draft not found.");
  requirePermission(state, actor, action, {
    channel: draft.channel, account: draft.account, contentId: id, assignedTo: draft.assignedTo,
  });
  if (!canReadNewsletterSource(state, actor, draft))
    throw new StudioError(403, "Newsletter source access changed.");
  return draft;
}

export function templatePath(id: string) {
  return `newsletter-templates/${id}.docx`;
}

export async function readHostedTemplate(db: StudioDatabase, id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new StudioError(400, "Invalid newsletter template.");
  const { data: record, error: lookupError } = await db.from("studio_newsletter_templates").select("id").eq("id", id).maybeSingle();
  if (lookupError) throw new StudioError(503, "The newsletter template library is unavailable. Check the Supabase migration.");
  if (!record) throw new StudioError(404, "Newsletter template not found.");
  const { data, error } = await db.storage.from("studio-assets").download(templatePath(id));
  if (!data || error) throw new StudioError(503, "The saved Word template could not be loaded.");
  return new Uint8Array(await data.arrayBuffer());
}

export async function hostedNewsletterGuidance(db: StudioDatabase, id: string) {
  return newsletterWritingGuidance(await readHostedTemplate(db, id));
}

export async function hostedNewsletterOutline(db: StudioDatabase, id: string) {
  return newsletterTemplateOutline(await readHostedTemplate(db, id));
}

export function formattedNewsletterJob(state: StudioState, contentId: string, revision: number, templateId: string, jobId?: string) {
  return state.jobs.find(job => {
    if ((jobId && job.id !== jobId) || job.contentId !== contentId || job.targetRevision !== revision || job.kind !== "text") return false;
    try { return JSON.parse(job.prompt).templateExportId === templateId; } catch { return false; }
  });
}
