import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, DEMO_ACTOR, EMPTY_MEDIA } from "../lib/studio/seed";
import { slideLayersSchema, moveSlideLayer } from "../lib/studio/layers";
import { applyCommand } from "../lib/studio/engine";
import { factsSignature } from "../lib/studio/stages";
import {
  serializeProject,
  importProject,
  renderSlide,
} from "../lib/studio/exports";
import type { SlideLayer, Slide } from "../lib/studio/types";
const text: SlideLayer = {
  id: "text-layer",
  kind: "text",
  text: "Record the recovery contact.",
  x: 10,
  y: 60,
  width: 70,
  height: 20,
  opacity: 1,
  fontSize: 40,
  color: "#0B3A42",
  weight: 700,
  align: "center",
};
const shape: SlideLayer = {
  id: "shape-layer",
  kind: "shape",
  shape: "ellipse",
  x: 10,
  y: 60,
  width: 70,
  height: 20,
  opacity: 0.5,
  fill: "#42D6C0",
};
const slide: Slide = {
  id: "slide",
  title: "Handoff checklist",
  body: "A documented routine",
  x: 10,
  y: 10,
  color: "#0B3A42",
  background: "#FFFFFF",
  fontSize: 40,
  layers: [shape, text],
};
test("source roundtrip preserves text/shape layering and invalid/out-of-bounds/duplicate layers reject", () => {
  const media = {
    ...structuredClone(EMPTY_MEDIA),
    slides: [structuredClone(slide)],
  };
  assert.deepEqual(importProject(serializeProject(media)), media);
  assert.throws(() => slideLayersSchema.parse([text, { ...text }]));
  assert.throws(() => slideLayersSchema.parse([{ ...text, x: 99, width: 20 }]));
  assert.throws(() => slideLayersSchema.parse([{ ...text, opacity: 2 }]));
  assert.deepEqual(moveSlideLayer(text, 99, -5), { ...text, x: 30, y: 0 });
});
test("style/position and shape-only edits preserve factual signature; overlay wording changes reopen evidence", () => {
  const s = initialState(DEMO_ACTOR, true);
  const d = s.contents[0];
  d.media.slides = [structuredClone(slide)];
  const before = factsSignature(d);
  d.media.slides[0].layers = [{ ...text, x: 20, color: "#FFFFFF" }, shape];
  assert.equal(factsSignature(d), before);
  d.media.slides[0].layers = [{ ...text, text: "A different claim" }, shape];
  assert.notEqual(factsSignature(d), before);
});
test("non-overridable blockers and missing-source markers apply to layer text even when invisible", () => {
  const s = initialState(DEMO_ACTOR, true);
  const d = s.contents[0];
  d.text = "A written handoff explains recovery contacts.";
  d.media.slides = [
    {
      ...structuredClone(slide),
      layers: [
        { ...text, text: "[Ryan to confirm: unsupported example]", opacity: 0 },
      ],
    },
  ];
  assert.throws(
    () =>
      applyCommand(
        s,
        DEMO_ACTOR,
        {
          type: "package.approve",
          contentId: d.id,
          expectedRevision: d.revision,
          expectedWorkflowId: "seed-linkedin",
          expectedRuleVersion: s.settings.protectedVersion,
        },
        { demo: true },
      ),
    /blocking factual|placeholders/,
  );
});
test("renderer draws shapes and clipped aligned text with layer opacity in array order", async () => {
  const actions: string[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    textAlign: "",
    globalAlpha: 1,
    fillRect() {
      actions.push("rect");
    },
    measureText(t: string) {
      return { width: t.length * 10 };
    },
    fillText(t: string, x: number) {
      actions.push(`text:${t}:${x}:${this.textAlign}:${this.globalAlpha}`);
    },
    save() {
      actions.push("save");
    },
    restore() {
      actions.push("restore");
    },
    beginPath() {},
    rect() {},
    clip() {
      actions.push("clip");
    },
    ellipse() {
      actions.push("ellipse");
    },
    fill() {
      actions.push(`fill:${this.globalAlpha}`);
    },
  };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      fonts: { ready: Promise.resolve() },
      createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
    },
  });
  try {
    await renderSlide(slide);
    assert.ok(actions.includes("ellipse"));
    assert.ok(actions.includes("fill:0.5"));
    assert.ok(
      actions.some((s) =>
        s.includes("Record the recovery contact.:486:center:1"),
      ),
    );
    assert.equal(actions.filter((a) => a === "clip").length, 2);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "document", descriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
