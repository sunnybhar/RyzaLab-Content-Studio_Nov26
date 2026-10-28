import type { Content } from "./types";
// Text included in a release, including invisible or clipped overlay text, must
// pass the same non-overridable factual checks and exact-line pricing rules.
export function contentWording(d: Content) {
  return [
    d.title,
    d.text,
    d.metadata,
    d.media.narration,
    d.media.captions,
    ...d.media.slides.flatMap((s) => [
      s.title,
      s.body,
      ...(s.layers || []).flatMap((l) => (l.kind === "text" ? [l.text] : [])),
    ]),
    ...d.media.scenes.flatMap((s) => [s.title, s.script]),
  ].join("\n");
}
