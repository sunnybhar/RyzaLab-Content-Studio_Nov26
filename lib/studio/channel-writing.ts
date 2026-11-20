import type { NewsletterSection } from "./newsletter-outline";
import type { Channel } from "./types";
export function writingFormatLabel(format: string, channel?: Channel) {
  if (format === "Text post" && channel === "LinkedIn") return "LinkedIn Post";
  if (format === "Article") return "Blog Article";
  if (format === "Newsletter") return "Brand Newsletter";
  return format;
}

export function writingFormat(prompt?: string) {
  try {
    return JSON.parse(prompt || "{}").format as string | undefined;
  } catch {
    return undefined;
  }
}
export function isLongForm(channel?: Channel, format?: string) {
  return (
    channel === "Newsletter" ||
    channel === "Hub" ||
    (typeof format === "string" && /newsletter|article|blog/i.test(format))
  );
}
export function writingWordTarget(channel?: Channel, format?: string) {
  if (channel === "Newsletter") return { label: "Newsletter", min: 1600, max: 3000 };
  if (channel === "LinkedIn" && /article/i.test(format || ""))
    return { label: "LinkedIn article", min: 800, max: 1200 };
  if (isLongForm(channel, format)) return /blog/i.test(format || "")
    ? { label: "Blog", min: 800, max: 2000 }
    : { label: "Article", min: 1600, max: 3000 };
  return undefined;
}

export function blogArticleLengthIssue(channel: Channel, format: string, body: string) {
  if (channel !== "LinkedIn" || format !== "Article") return;
  const target = writingWordTarget(channel, format)!;
  const count = writingWordCount(body);
  if (count < target.min || count > target.max)
    return `Blog Article requires 800–1,200 words before Sources. This version contains ${count.toLocaleString("en-US")} words.`;
}

export function writingWordCount(text: string) {
  const prose = text.split(/^\s*(?:#{1,6}\s+)?(?:Sources|References)\s*:?\s*$/im, 1)[0]
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "");
  return prose.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function channelWritingContract(channel?: Channel, prompt?: string) {
  const format = writingFormat(prompt);
  const target = writingWordTarget(channel, format);
  if (target && newsletterTemplateFromPrompt(prompt || "")?.exportOnly) return "NEWSLETTER EXPORT: preserve the saved newsletter’s meaning and approximate length. Follow the template’s section and table structure with minimal edits. Use only the facts, examples and citations already supported by the copy.";
  const articleGuidance = channel === "LinkedIn" && format === "Article"
    ? "This is a Blog Article. The short LinkedIn post limits, examples, and deliverable rules in the workflow do not apply. Aim for about 1,000–1,100 words of body prose across an introduction and several substantive sections. Check that the body reaches at least 800 words before returning it. Develop supported details and practical examples without padding or inventing evidence. "
    : "";
  if (target) {
    return `${articleGuidance}${target.label.toUpperCase()}: write ${target.min.toLocaleString("en-US")}–${target.max.toLocaleString("en-US")} words of original substantive copy, excluding the Sources bibliography (about ${target.min / 200}–${target.max / 200} minutes at 200 words per minute). Use the selected template for structure, sections, tables and design; the Studio word range takes precedence over the template’s length guidance. Use the supplied evidence for practical insights, comparisons and qualified numbers. Include an introduction, readable Markdown section headings and a Sources section. Distinguish facts, inference and uncertainty. Never invent data, sources, quotes, access or experience. Return one complete piece with an optional imageBrief.`;
  }
  return "SOCIAL POST: write one concise platform-appropriate post; for LinkedIn default to 180–250 words unless the user requests another length. Do not put a Sources bibliography or research report in the post body. Keep provenance in the separate sources field for editorial checking. No invented claims or personal experience.";
}

export function newsletterTemplateFromPrompt(prompt: string): { sections: NewsletterSection[]; exportOnly: boolean } | undefined {
  try {
    const data = JSON.parse(prompt);
    if (Array.isArray(data.newsletterTemplate?.sections))
      return { sections: data.newsletterTemplate.sections, exportOnly: Boolean(data.templateExportId) };
  } catch {
    // Older jobs may store plain text prompts.
  }
  return undefined;
}
