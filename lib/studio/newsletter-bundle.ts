import { z } from "zod";
import {
  storedAgentFileSchema,
  validateStoredAgentFile,
  type StoredAgentFile,
} from "./agent-rule-files";
import { requirePermission, StudioError } from "./permissions";
import { pipelineSnapshot } from "./pipeline";
import type { Actor, Channel, StudioState } from "./types";
const id = z.string().min(1).max(200);
export const newsletterInputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("content"),
      id,
      expectedRevision: z.number().int().positive(),
    })
    .strict(),
  z.object({ kind: z.literal("idea"), id }).strict(),
  z.object({ kind: z.literal("pipeline"), id }).strict(),
  z
    .object({
      kind: z.literal("text"),
      title: z.string().trim().min(1).max(200),
      text: z.string().trim().min(1).max(30000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("document"),
      file: storedAgentFileSchema,
      extractedText: z.string().trim().min(1).max(60000).optional(),
    })
    .strict(),
]);
export type NewsletterInput = z.infer<typeof newsletterInputSchema>;
export interface NewsletterSourceSnapshot {
  kind: NewsletterInput["kind"];
  id?: string;
  channel?: Channel;
  title: string;
  text: string;
  metadata: string;
  revision?: number;
  capturedAt: string;
  file?: StoredAgentFile;
}
export function newsletterSources(
  state: StudioState,
  actor: Actor,
  inputs: NewsletterInput[],
  now: string,
): NewsletterSourceSnapshot[] {
  const seen = new Set<string>();
  const sources = inputs.map((input) => {
    const identity =
      "id" in input
        ? input.kind + ":" + input.id
        : input.kind === "document"
          ? "document:" + input.file.fileName
          : undefined;
    if (identity && seen.has(identity))
      throw new StudioError(400, "Remove duplicate newsletter sources.");
    if (identity) seen.add(identity);
    if (input.kind === "content") {
      const c = state.contents.find((c) => c.id === input.id && !c.deletedAt);
      if (!c || c.revision !== input.expectedRevision)
        throw new StudioError(
          409,
          "A selected post changed or was removed. Refresh and select its current version.",
        );
      requirePermission(state, actor, "read", {
        channel: c.channel,
        account: c.account,
        contentId: c.id,
        assignedTo: c.assignedTo,
      });
      return {
        kind: input.kind,
        id: c.id,
        channel: c.channel,
        title: c.title,
        text: c.text,
        metadata: c.metadata,
        revision: c.revision,
        capturedAt: now,
      };
    }
    if (input.kind === "idea") {
      const idea = state.ideas.find((i) => i.id === input.id);
      if (!idea) throw new StudioError(404, "Selected idea not found.");
      requirePermission(state, actor, "read", { channel: idea.channel });
      return {
        kind: input.kind,
        id: idea.id,
        channel: idea.channel,
        title: idea.title,
        text: idea.brief,
        metadata: idea.sources.join("\n"),
        capturedAt: now,
      };
    }
    if (input.kind === "pipeline") {
      const p = pipelineSnapshot(state, actor, input.id)!;
      return {
        kind: input.kind,
        id: p.id,
        channel: p.channel,
        title: p.title,
        text: p.angle + "\n" + p.existingCopy,
        metadata: p.sourceUrls.join("\n"),
        revision: p.version,
        capturedAt: now,
      };
    }
    if (input.kind === "document") {
      validateStoredAgentFile(input.file);
      if (!input.extractedText?.trim())
        throw new StudioError(
          400,
          "Document text could not be extracted. Use a searchable PDF/DOCX or paste its text.",
        );
      return {
        kind: input.kind,
        title: input.file.fileName,
        text: input.extractedText,
        metadata: "Uploaded document; claims require source checks.",
        file: input.file,
        capturedAt: now,
      };
    }
    return {
      kind: input.kind,
      title: input.title,
      text: input.text,
      metadata: "User-provided text; claims require source checks.",
      capturedAt: now,
    };
  });
  if (
    sources.reduce((n, s) => n + s.text.length + s.metadata.length, 0) > 60000
  )
    throw new StudioError(
      400,
      "Combined newsletter sources exceed 60,000 characters. Select fewer sources or shorter excerpts.",
    );
  if (sources.reduce((n, s) => n + (s.file?.byteSize || 0), 0) > 524288)
    throw new StudioError(
      400,
      "Combined document uploads must be at most 512 KB.",
    );
  return sources;
}
