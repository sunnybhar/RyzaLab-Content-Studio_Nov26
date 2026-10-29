import { z } from "zod";
export const draftResultSchema = z
  .object({
    body: z.string().trim().min(10).max(60000),
    metadata: z.string().max(12000).default(""),
    sources: z.array(z.string().max(2000)).max(30).default([]),
    questions: z.array(z.string().max(2000)).max(20).default([]),
    slides: z
      .array(
        z
          .object({ title: z.string().max(180), body: z.string().max(2000) })
          .strict(),
      )
      .max(30)
      .optional(),
  })
  .strict();
export type DraftResult = z.infer<typeof draftResultSchema>;
export const reviewResultSchema = z
  .object({
    summary: z.string().min(10).max(6000),
    issues: z
      .array(
        z
          .object({
            severity: z.enum(["block", "warning"]),
            message: z.string().min(5).max(3000),
            referenceIds: z.array(z.string().max(150)).max(30),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export function parseOutput<T>(text: string, schema: z.ZodType<T>): T {
  return schema.parse(
    JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    ),
  );
}
export const DRAFT_CONTRACT = `Return ONLY a JSON object with body (the complete selected piece), metadata (caption/publication notes), sources (provided reference IDs or section names), questions (actual missing facts), and optional slides [{title,body}] for a carousel. No weekly content pack, calendar, hook alternatives, analysis or format instructions in body. Write only the selected piece. Never invent facts or experiences. Mark missing facts in body [Ryan to confirm: ...].`;
export const REVIEW_CONTRACT = `Review the provided exact candidate and source context. Return ONLY JSON {"summary":"specific findings", "issues":[{"severity":"block or warning","message":"specific issue","referenceIds":[]}]}. Use only supplied references; do not claim current web access or visual inspection. Factual uncertainty is a block, style suggestions are warnings. Do not draft a content pack. Reference IDs must come from supplied references.`;
