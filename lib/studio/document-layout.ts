import { z } from "zod";
export const documentLayoutSchema = z
  .object({
    font: z.enum(["Arial", "Georgia", "Times New Roman"]).default("Arial"),
    bodySize: z.number().min(9).max(16).default(11),
    marginMm: z.number().min(12).max(35).default(20),
    lineSpacing: z.number().min(1).max(2).default(1.3),
    header: z.string().max(150).default(""),
    footer: z.string().max(150).default(""),
    pageSize: z.enum(["A4", "Letter"]).default("A4"),
  })
  .strict();
export type DocumentLayout = z.infer<typeof documentLayoutSchema>;
export function parseDocumentLayout(text?: string) {
  if (!text) return;
  try {
    return documentLayoutSchema.parse(JSON.parse(text));
  } catch {
    return;
  }
}
