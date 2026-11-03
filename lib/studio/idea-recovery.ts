import { generatedIdeasSchema, requestedIdeaQuantity } from "./idea-generation";
import type { Job } from "./types";
/** Recover only verbatim, individually complete strict-schema cards. Never close
 * unfinished JSON, supply missing fields, skip a malformed card or retry AI. */
export function completeSavedIdeaCards(
  job: Pick<Job, "result" | "prompt" | "providerCompletion" | "error">,
) {
  if (job.providerCompletion === "refused" || !job.result) return [];
  if (
    job.providerCompletion !== "incomplete" &&
    !/^\s*\[INCOMPLETE OUTPUT/i.test(job.result) &&
    !job.error?.startsWith("Idea generation was incomplete")
  )
    return [];
  const raw = job.result
    .trim()
    .replace(/^\[INCOMPLETE OUTPUT[^\r\n]*\]\s*/i, "")
    .replace(/^```(?:json)?\s*/i, "");
  const start = /^\{\s*"ideas"\s*:\s*\[/.exec(raw);
  if (!start) return [];
  const cards: import("zod").infer<typeof generatedIdeasSchema>["ideas"] = [];
  const limit = requestedIdeaQuantity(job.prompt) || 20;
  let cursor = start[0].length;
  while (cards.length < limit) {
    while (/\s/.test(raw[cursor] || "") && cursor < raw.length) cursor++;
    if (cards.length) {
      if (raw[cursor] !== ",") break;
      cursor++;
      while (/\s/.test(raw[cursor] || "") && cursor < raw.length) cursor++;
    }
    if (raw[cursor] !== "{") break;
    const from = cursor;
    let depth = 0,
      inString = false,
      escaped = false,
      closed = false;
    for (; cursor < raw.length; cursor++) {
      const ch = raw[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        cursor++;
        closed = true;
        break;
      }
    }
    if (!closed) break;
    try {
      const parsed = generatedIdeasSchema.shape.ideas.element.safeParse(
        JSON.parse(raw.slice(from, cursor)),
      );
      if (!parsed.success) break;
      cards.push(parsed.data);
    } catch {
      break;
    }
  }
  return cards;
}
