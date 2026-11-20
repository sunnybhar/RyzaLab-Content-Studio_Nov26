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
export function channelWritingContract(channel?: Channel, prompt?: string) {
  const format = writingFormat(prompt);
  if (channel === "Newsletter" && prompt && newsletterTemplateFromPrompt(prompt)) {
    return "NEWSLETTER: follow the selected template’s sections, tables, length and editorial guidance. Return one complete newsletter. Preserve supplied evidence and distinguish facts from inference. Flag missing facts and do not invent experiences, claims or citations.";
  }
  if (isLongForm(channel, format)) {
    const blog = /blog/i.test(format || "");
    return `${blog ? "BLOG: target 800–2,000 words, an estimated 4–10 minute read" : "NEWSLETTER / ARTICLE: target 1,600–3,000 words, an estimated 8–15 minute read"} at 200 words per minute. Write substantive evidence-led prose, not padding to meet a count. Include a title, background/introduction, descriptive Markdown ## section headings (preserve headings linked to existing images), relevant data when supported, reasoning, practical implications, limitations and conclusion. Use the selected structure/template when supplied. Cite only actual supplied source URLs or document sections and include a readable Sources section. Distinguish supported facts from inference; never invent numbers, dates, quotes, personal experiences or source access. If essential facts are missing, identify the specific gap rather than fabricate. Return an imageBrief, without claiming that any image was generated or verified. Output one complete ${blog ? "focused blog article" : "coherent newsletter with several related sections when multiple inputs are supplied"}, not a pack of alternative posts. PDF page count depends on the chosen layout, not word count alone.`;
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
