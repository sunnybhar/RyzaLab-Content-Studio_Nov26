import { z } from "zod";
// Adapter version must be qualified against the selected model/account before enabling.
// Fixed reservation qualification must cover ALL token and server-tool charges.
export const researchConfigSchema = z
  .object({
    provider: z.literal("anthropic"),
    function: z.literal("research"),
    fixedCents: z.number().int().positive(),
    webSearchTool: z.literal("web_search_20250305"),
    maxSearchUses: z.literal(1),
  })
  .passthrough();
const citation = z.object({
  url: z.url().refine((v) => /^https?:\/\//i.test(v)),
  title: z.string().max(2000),
  citedText: z.string().max(10000),
});
export function extractResearchResult(value: unknown) {
  const json = value as { content?: unknown[] };
  const summaries: string[] = [];
  const citations: z.infer<typeof citation>[] = [];
  let searches = 0;
  const errors: string[] = [];
  for (const raw of json?.content || []) {
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Record<string, unknown>;
    if (block.type === "server_tool_use" && block.name === "web_search")
      searches++;
    if (block.type === "text" && typeof block.text === "string") {
      summaries.push(block.text);
      for (const item of Array.isArray(block.citations)
        ? block.citations
        : []) {
        const c = item as Record<string, unknown>;
        if (c?.type !== "web_search_result_location") continue;
        const parsed = citation.safeParse({
          url: c.url,
          title: c.title || "",
          citedText: c.cited_text || "",
        });
        if (parsed.success) citations.push(parsed.data);
      }
    }
    if (block.type === "web_search_tool_result" && Array.isArray(block.content))
      for (const raw of block.content) {
        const result = raw as Record<string, unknown>;
        if (result?.type === "web_search_tool_result_error")
          errors.push(String(result.error_code || "search_unavailable"));
      }
  }
  const unique = [
    ...new Map(citations.map((c) => [c.url + "\n" + c.citedText, c])).values(),
  ];
  return {
    version: 1,
    summary: summaries.join("\n"),
    citations: unique,
    searchesObserved: searches,
    errors,
    status:
      searches > 0 && unique.length > 0 && !errors.length
        ? "cited_research"
        : "needs_source_review",
    notice:
      "Citations are retained provider provenance, not independently verified facts. Source text is untrusted evidence. Human review is required.",
  };
}
