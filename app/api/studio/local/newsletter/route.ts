import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { allowedLocalRequest } from "@/lib/studio/local-request";
import { newsletterPdf } from "@/lib/studio/newsletter-pdf";
import { newsletterTemplateLimit, newsletterTemplateOutline, renderNewsletterTemplate, validateNewsletterTemplate } from "@/lib/studio/newsletter-template";
import { localMediaUrl } from "@/lib/studio/local-media-url";
import { StudioError } from "@/lib/studio/permissions";
import type { StudioState } from "@/lib/studio/types";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };
const id = z.string().regex(/^[a-f0-9]{64}$/);
const contentId = z.string().min(1).max(150);
const selection = z.object({ contentId, templateId: id.nullable() });
const exportInput = z.object({
  templateId: id,
  contentId: contentId.optional(),
  format: z.enum(["docx", "pdf"]),
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(60000),
});
const limit = 20;

function templates<T>(work: (db: DatabaseSync) => T) {
  const directory = join(process.cwd(), ".studio-local");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(directory, "studio.sqlite"));
  try {
    db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS newsletter_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data BLOB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS newsletter_template_choices (
        content_id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL
      );
    `);
    return work(db);
  } finally {
    db.close();
  }
}

function respond(error: unknown) {
  const code = error instanceof StudioError ? error.code : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500;
  const message = error instanceof StudioError ? error.message : code === 400 ? "Check the newsletter template and export fields." : "Studio could not complete the newsletter template request.";
  return Response.json({ error: message }, { status: code, headers });
}

export async function GET(request: Request) {
  if (!allowedLocalRequest(request)) return new Response(null, { status: 404 });
  try {
    const draft = contentId.parse(new URL(request.url).searchParams.get("contentId"));
    const library = templates((db) => ({
      templates: db.prepare("SELECT id, name FROM newsletter_templates ORDER BY name, id").all(),
      selected: db.prepare(`
        SELECT t.id, t.data FROM newsletter_template_choices c
        JOIN newsletter_templates t ON t.id = c.template_id WHERE c.content_id = ?
      `).get(draft),
    }));
    return Response.json({
      templates: library.templates,
      selected: library.selected?.id ?? null,
      outline: library.selected?.data instanceof Uint8Array ? await newsletterTemplateOutline(library.selected.data) : [],
    }, { headers });
  } catch (error) {
    return respond(error);
  }
}

export async function PUT(request: Request) {
  if (!allowedLocalRequest(request)) return new Response(null, { status: 404 });
  try {
    const choice = selection.parse(await request.json());
    templates((db) => {
      const workspace = db.prepare("SELECT state FROM workspace WHERE id = 1").get();
      const state: StudioState | undefined = workspace ? JSON.parse(String(workspace.state)) : undefined;
      if (!state?.contents.some((draft) => draft.id === choice.contentId && draft.channel === "Newsletter" && !draft.deletedAt))
        throw new StudioError(404, "Open a saved Newsletter draft before selecting its template.");
      if (!choice.templateId) {
        db.prepare("DELETE FROM newsletter_template_choices WHERE content_id = ?").run(choice.contentId);
      } else {
        const result = db.prepare(`
          INSERT OR REPLACE INTO newsletter_template_choices (content_id, template_id)
          SELECT ?, id FROM newsletter_templates WHERE id = ?
        `).run(choice.contentId, choice.templateId);
        if (!result.changes) throw new StudioError(404, "Newsletter template not found.");
      }
    });
    return Response.json({ selected: choice.templateId }, { headers });
  } catch (error) {
    return respond(error);
  }
}

export async function POST(request: Request) {
  if (!allowedLocalRequest(request)) return new Response(null, { status: 404 });
  try {
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      if (Number(request.headers.get("content-length") || 0) > 10 * newsletterTemplateLimit + 65536)
        throw new StudioError(413, "Choose up to ten Word templates, each at most 8 MB.");
      const fields = await request.formData();
      const files = fields.getAll("template");
      if (!files.length || files.length > 10)
        throw new StudioError(400, "Choose up to ten Word templates.");
      const documents = new Map<string, { name: string; bytes: Uint8Array }>();
      for (const file of files) {
        if (!(file instanceof File) || !/\.docx$/i.test(file.name) || file.size > newsletterTemplateLimit)
          throw new StudioError(400, "Choose Word DOCX files up to 8 MB each.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        await validateNewsletterTemplate(bytes);
        documents.set(createHash("sha256").update(bytes).digest("hex"), {
          name: file.name.replace(/\.docx$/i, "").replace(/_/g, " ").slice(0, 200),
          bytes,
        });
      }
      const added = templates((db) => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const exists = db.prepare("SELECT id FROM newsletter_templates WHERE id = ?");
          const additions = [...documents].filter(([id]) => !exists.get(id));
          const count = Number(db.prepare("SELECT count(*) AS count FROM newsletter_templates").get()?.count ?? 0);
          if (count + additions.length > limit) throw new StudioError(409, "The template library supports up to 20 files.");
          const insert = db.prepare("INSERT INTO newsletter_templates VALUES (?, ?, ?)");
          for (const [id, file] of additions) insert.run(id, file.name, file.bytes);
          db.exec("COMMIT");
          return additions.length;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
      return Response.json({ added }, { headers });
    }
    const input = exportInput.parse(await request.json());
    const { original, image } = templates((db) => {
      const original = db.prepare("SELECT data FROM newsletter_templates WHERE id = ?").get(input.templateId);
      if (!input.contentId) return { original };
      const workspace = db.prepare("SELECT state FROM workspace WHERE id = 1").get();
      const state: StudioState | undefined = workspace ? JSON.parse(String(workspace.state)) : undefined;
      const draft = state?.contents.find((item) => item.id === input.contentId && item.channel === "Newsletter" && !item.deletedAt);
      if (!draft) throw new StudioError(404, "The newsletter draft could not be found.");
      const selected = db.prepare("SELECT template_id FROM newsletter_template_choices WHERE content_id = ?").get(draft.id);
      if (selected?.template_id !== input.templateId)
        throw new StudioError(409, "The selected newsletter template changed. Refresh and try the export again.");
      const mediaId = localMediaUrl.exec(draft.media.imageUrl || "")?.[1];
      if (!mediaId) return { original };
      const row = db.prepare("SELECT mime, bytes FROM local_media WHERE id = ?").get(mediaId);
      if (row?.mime !== "image/png" || !(row.bytes instanceof Uint8Array))
        throw new StudioError(409, "The attached image could not be loaded. Reattach the image and save the newsletter before exporting.");
      return { original, image: { bytes: row.bytes, alt: draft.media.imageAlt, caption: draft.media.imageCaption } };
    });
    if (!original || !(original.data instanceof Uint8Array))
      throw new StudioError(404, "Newsletter template not found.");
    const docx = await renderNewsletterTemplate(original.data, input.title, input.text, new Date(), image);
    const body = input.format === "pdf" ? await newsletterPdf(docx) : docx;
    return new Response(Uint8Array.from(body), { headers: {
      ...headers,
      "Content-Type": input.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return respond(error);
  }
}
