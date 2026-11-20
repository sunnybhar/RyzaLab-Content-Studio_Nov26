import type { NewsletterSection } from "./newsletter-outline";
import type { Channel } from "./types";
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

export function writingWordCount(text: string) {
  const prose = text.split(/^\s*(?:#{1,6}\s+)?(?:Sources|References)\s*:?\s*$/im, 1)[0]
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "");
  return prose.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function channelWritingContract(channel?: Channel, prompt?: string) {
  const format = writingFormat(prompt);
  const target = writingWordTarget(channel, format);
  if (target) {
    return `${target.label.toUpperCase()}: write ${target.min.toLocaleString("en-US")}–${target.max.toLocaleString("en-US")} words of original substantive copy, excluding the Sources bibliography (about ${target.min / 200}–${target.max / 200} minutes at 200 words per minute). Use the selected template for structure, sections, tables and design; the Studio word range takes precedence over the template’s length guidance. Use the supplied evidence for practical insights, comparisons and qualified numbers. Include an introduction, readable Markdown section headings and a Sources section. Distinguish facts, inference and uncertainty. Never invent data, sources, quotes, access or experience. Return one complete piece with an optional imageBrief.`;
  }
  return "SOCIAL POST: write one concise platform-appropriate post; for LinkedIn default to 180–250 words unless the user requests another length. Do not put a Sources bibliography or research report in the post body. Keep provenance in the separate sources field for editorial checking. No invented claims or personal experience.";
}

export function newsletterTemplateFromPrompt(prompt: string): { sections: NewsletterSection[] } | undefined {
  try {
    const template = JSON.parse(prompt).newsletterTemplate;
    if (Array.isArray(template?.sections)) return template;
  } catch {
    // Older jobs may store plain text prompts.
  }
  return undefined;
}
