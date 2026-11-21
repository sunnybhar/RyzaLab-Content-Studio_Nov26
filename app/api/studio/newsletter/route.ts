import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState, persist } from "@/lib/studio/store";
import { requirePermission, StudioError } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";
import { studioAssetUrl } from "@/lib/studio/assets";
import { newsletterStructureIssue } from "@/lib/studio/newsletter-outline";
import { validateNewsletterTemplate, newsletterTemplateOutline, renderNewsletterTemplate } from "@/lib/studio/newsletter-template";
import {
  formattedNewsletterJob, hostedNewsletterLimit, hostedNewsletterOutline, newsletterDocxType,
  newsletterDraft, readHostedTemplate, templatePath, type StudioDatabase,
} from "@/lib/studio/hosted-newsletter";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const contentId = z.string().min(1).max(150);
const templateId = z.string().regex(/^[a-f0-9]{64}$/);
const revision = z.number().int().positive();

async function savedImage(db: StudioDatabase, draft: ReturnType<typeof newsletterDraft>) {
  if (!draft.media.imageUrl) return;
  const id = studioAssetUrl.exec(draft.media.imageUrl)?.[1];
  if (!id) throw new StudioError(409, "Attach a saved Studio image before exporting with a template.");
  const { data: asset } = await db.from("studio_assets").select("object_path,mime").eq("id", id).eq("content_id", draft.id).maybeSingle();
  if (!asset || asset.mime !== "image/png") throw new StudioError(409, "Attach a saved PNG image before exporting with this template.");
  const { data, error } = await db.storage.from("studio-assets").download(asset.object_path);
  if (!data || error) throw new StudioError(503, "The saved newsletter image could not be loaded.");
  return { bytes: new Uint8Array(await data.arrayBuffer()), alt: draft.media.imageAlt, caption: draft.media.imageCaption };
}

export async function GET(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    const draft = newsletterDraft(state, actor, contentId.parse(req.nextUrl.searchParams.get("contentId")));
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (jobId) {
      const job = draft.newsletterTemplateId && formattedNewsletterJob(state, draft.id, draft.revision, draft.newsletterTemplateId, contentId.parse(jobId));
      if (!job) throw new StudioError(404, "Saved formatting request unavailable for this template and revision.");
      return NextResponse.json({ id: job.id, state: job.state, outputStatus: job.outputStatus, error: job.error }, { headers });
    }
    const { data, error } = await db.from("studio_newsletter_templates").select("id,name").order("name");
    if (error) throw new StudioError(503, "The newsletter template library is unavailable. Check the Supabase migration.");
    const selected = draft.newsletterTemplateId ?? null;
    const job = selected ? formattedNewsletterJob(state, draft.id, draft.revision, selected) : undefined;
    return NextResponse.json({
      templates: data, selected, formatJob: job && { id: job.id, state: job.state, outputStatus: job.outputStatus, error: job.error }, outline: selected ? await hostedNewsletterOutline(db, selected) : [],
    }, { headers });
  } catch (error) { return failure(error); }
}

export async function PUT(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const input = z.object({ contentId, templateId: templateId.nullable(), expectedRevision: revision }).parse(await req.json());
    const state = await loadState(db, actor);
    const draft = newsletterDraft(state, actor, input.contentId, "content.edit");
    if (draft.state !== "draft" || draft.revision !== input.expectedRevision)
      throw new StudioError(409, "Open the current working draft before changing its template.");
    if (input.templateId) await readHostedTemplate(db, input.templateId);
    const next = structuredClone(state);
    next.contents.find(item => item.id === draft.id)!.newsletterTemplateId = input.templateId ?? undefined;
    next.version++;
    next.audit.push({ id: crypto.randomUUID(), action: "newsletter.template.select", actor: actor.email, target: draft.id, at: new Date().toISOString() });
    await persist(db, state, next);
    return NextResponse.json({ selected: input.templateId }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req);
    const state = await loadState(db, actor);
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      if (Number(req.headers.get("content-length") ?? 0) > hostedNewsletterLimit + 65536)
        throw new StudioError(413, "Choose a Word template up to 4 MB.");
      const data = await req.formData();
      const draft = newsletterDraft(state, actor, contentId.parse(data.get("contentId")), "content.edit");
      requirePermission(state, actor, "workflow.edit", { channel: draft.channel });
      if (draft.state !== "draft") throw new StudioError(409, "Open a working newsletter draft to add a template.");
      const file = data.get("template");
      if (!(file instanceof File) || !/\.docx$/i.test(file.name) || file.size > hostedNewsletterLimit)
        throw new StudioError(400, "Choose a Word DOCX up to 4 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      await validateNewsletterTemplate(bytes);
      const id = createHash("sha256").update(bytes).digest("hex");
      const { data: existing, error: lookupError } = await db.from("studio_newsletter_templates").select("id").eq("id", id).maybeSingle();
      if (lookupError) throw new StudioError(503, "The newsletter template library is unavailable. Check the Supabase migration.");
      if (existing) return NextResponse.json({ added: 0 }, { headers });
      // The object path is content-addressed. Concurrent uploads contain the same bytes.
      const { error: uploadError } = await db.storage.from("studio-assets")
        .upload(templatePath(id), bytes, { contentType: newsletterDocxType, upsert: true });
      if (uploadError) throw new StudioError(503, "The Word template could not be saved to private storage.");
      const name = file.name.replace(/\.docx$/i, "").replace(/_/g, " ").trim().slice(0, 200) || "Newsletter template";
      const { error } = await db.from("studio_newsletter_templates").insert({ id, name });
      if (error && error.code !== "23505") throw new StudioError(503, "The template could not be added to the library. Retry the upload.");
      return NextResponse.json({ added: error ? 0 : 1 }, { headers });
    }
    const input = z.object({ contentId, templateId, expectedRevision: revision, format: z.literal("docx") }).parse(await req.json());
    const draft = newsletterDraft(state, actor, input.contentId);
    if (draft.revision !== input.expectedRevision || draft.newsletterTemplateId !== input.templateId)
      throw new StudioError(409, "The draft or selected template changed. Refresh before exporting.");
    const bytes = await readHostedTemplate(db, input.templateId);
    const outline = await newsletterTemplateOutline(bytes);
    let text = draft.text;
    if (newsletterStructureIssue(outline, text)) {
      const job = formattedNewsletterJob(state, draft.id, draft.revision, input.templateId);
      if (job?.state !== "succeeded" || job.outputStatus !== "ready" || !job.candidate?.body)
        throw new StudioError(409, "Format the saved newsletter with this template before downloading.");
      text = job.candidate.body;
    }
    if (!text.trim()) throw new StudioError(409, "Save newsletter copy before exporting.");
    const result = await renderNewsletterTemplate(bytes, draft.title, text, new Date(), await savedImage(db, draft));
    if (result.byteLength > hostedNewsletterLimit)
      throw new StudioError(413, "The Word export exceeds 4 MB. Use a smaller template or main image.");
    return new NextResponse(Uint8Array.from(result), {
      headers: { ...headers, "Content-Type": newsletterDocxType, "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) { return failure(error); }
}
