import type { Content, StudioState } from "./types";
// Text included in a release, including invisible or clipped overlay text, must
// pass the same non-overridable factual checks and exact-line pricing rules.
export function contentWording(d: Content) {
  return [
    d.title,
    d.text,
    d.metadata,
    d.media.narration,
    d.media.captions,
    ...(d.media.imageAlt?[d.media.imageAlt]:[]),
    ...(d.media.imageCaption?[d.media.imageCaption]:[]),
    ...(d.media.sectionImages||[]).flatMap(image=>[image.alt,image.caption]),
    ...d.media.slides.flatMap((s) => [
      s.title,
      s.body,
      ...(s.layers || []).flatMap((l) => (l.kind === "text" ? [l.text] : [])),
    ]),
    ...d.media.scenes.flatMap((s) => [s.title, s.script]),
  ].join("\n");
}

export function unresolvedPriceLines(content: Content, state: StudioState) {
  const exceptions = new Set((state.exceptions || []).filter((entry) =>
    entry.contentId === content.id && entry.revision === content.revision &&
    entry.ruleVersion === state.settings.protectedVersion,
  ).map((entry) => entry.wording));
  const lines = contentWording(content).split("\n").map((line) => line.trim());
  return [...new Set(lines)].filter((line) => {
    if (exceptions.has(line)) return false;
    if (/\$\s*\d/.test(line)) return true;
    const wording = line.replace(/https?:\/\/[^\s)]+/gi, "")
      .replace(/\bfeel\s+free\s+to\b|\bfree\s+(?:from|of(?!\s+charge\b))\b|\b(?:hands|cloud|ad|worry|clutter|wire|cable|subscription|gluten|dairy|sugar)[-‑–]free\b/gi, "");
    return /\bfree\b/i.test(wording);
  });
}
