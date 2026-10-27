import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeAsset,
  buildSrt,
  exportContentDocument,
  importDocx,
  importProject,
  mediaProjectSchema,
  renderSlide,
  serializeProject,
} from "../lib/studio/exports";
import type { MediaProject } from "../lib/studio/types";

function project(): MediaProject {
  return {
    slides: [
      {
        id: "slide-1",
        title: "A headline",
        body: "First paragraph.\nSecond paragraph.",
        color: "#123456",
        background: "#fff8e8",
        x: 10,
        y: 20,
        fontSize: 60,
      },
    ],
    scenes: [
      {
        id: "scene-1",
        title: "Opening",
        script: "Hello world.",
        duration: 1.25,
        preserveAudio: false,
      },
      {
        id: "scene-2",
        title: "Closing",
        script: "Goodbye.",
        duration: 2.75,
        preserveAudio: true,
        sourceUrl: "https://reference.example/video.mp4",
      },
    ],
    imagePrompt: "An illustration",
    narration: "Hello world. Goodbye.",
    captions: "",
    aspect: "9:16",
    templateId: "editorial",
  };
}

test("editable source roundtrips all layout, audio, caption, and final aspect choices", () => {
  const media = project();
  media.slides[0].image = "data:image/png;base64,aGVsbG8=";
  media.scenes[0].audioUrl = "/api/studio/assets/narration.mp3";
  media.imageUrl = "/storage/illustration.png";
  media.captions = "Hello\nGoodbye";
  assert.deepEqual(importProject(serializeProject(media)), media);
  for (const aspect of ["9:16", "16:9", "1:1"] as const)
    assert.equal(
      importProject(serializeProject({ ...media, aspect })).aspect,
      aspect,
    );
});

test("source importer rejects unknown versions, hostile keys, malformed files, and excessive size", () => {
  assert.throws(() => importProject("{invalid"), /valid JSON/);
  const source = JSON.parse(serializeProject(project()));
  source.version = 2;
  assert.throws(() => importProject(JSON.stringify(source)), /Invalid project/);
  source.version = 1;
  source.project.untrusted = true;
  assert.throws(() => importProject(JSON.stringify(source)), /Invalid project/);
  assert.throws(() => importProject(" ".repeat(32 * 1024 * 1024 + 1)), /32 MB/);
  assert.throws(
    () =>
      importProject(
        JSON.stringify({
          format: "ryzalab-media",
          version: 1,
          project: { ...project(), aspect: "4:3" },
        }),
      ),
    /aspect/,
  );
});

test("project schema rejects invalid layout, duplicate items, unsafe image sources, and scene durations", () => {
  for (const duration of [0, -1, NaN, Infinity, 3601])
    assert.equal(
      mediaProjectSchema.safeParse({
        ...project(),
        scenes: [{ ...project().scenes[0], duration }],
      }).success,
      false,
    );
  for (const change of [
    { x: 101 },
    { y: -1 },
    { fontSize: 1 },
    { fontSize: 181 },
    { background: "#abcde" },
    { color: "url(evil)" },
    { image: "javascript:alert(1)" },
    { image: "data:image/svg+xml;base64,YQ==" },
  ])
    assert.equal(
      mediaProjectSchema.safeParse({
        ...project(),
        slides: [{ ...project().slides[0], ...change }],
      }).success,
      false,
    );
  for (const sourceUrl of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "https://user:secret@example.com/clip.mp4",
  ])
    assert.equal(
      mediaProjectSchema.safeParse({
        ...project(),
        scenes: [{ ...project().scenes[0], sourceUrl }],
      }).success,
      false,
    );
  const media = project();
  media.slides.push({ ...media.slides[0] });
  assert.equal(mediaProjectSchema.safeParse(media).success, false);
  assert.equal(
    mediaProjectSchema.safeParse({
      ...project(),
      scenes: Array.from({ length: 25 }, (_, index) => ({
        ...project().scenes[0],
        id: `scene-${index}`,
        duration: 3600,
      })),
    }).success,
    false,
  );
});

test("asset guard allows embedded raster and same-origin assets and blocks unsafe/cross-origin media", () => {
  const origin = "https://studio.example";
  for (const source of [
    "/api/studio/assets/a.png",
    "https://studio.example/storage/a.jpg",
    "data:image/png;base64,YQ==",
  ])
    assert.doesNotThrow(() => assertSafeAsset(source, origin));
  for (const source of [
    "https://other.example/a.png",
    "//other.example/a.png",
    "javascript:alert(1)",
    "blob:https://studio.example/id",
    "data:image/svg+xml;base64,YQ==",
    "https://user:secret@studio.example/a.png",
  ])
    assert.throws(() => assertSafeAsset(source, origin));
  assert.doesNotThrow(() =>
    assertSafeAsset("data:video/mp4;base64,YQ==", origin, "media"),
  );
  assert.throws(() =>
    assertSafeAsset("data:video/mp4;base64,YQ==", origin, "image"),
  );
});

test("scene captions use cumulative millisecond timing without dropping blank scenes", () => {
  const media = project();
  media.scenes.splice(1, 0, {
    ...media.scenes[0],
    id: "silent",
    duration: 0.5,
    script: "",
  });
  assert.equal(
    buildSrt(media),
    "1\n00:00:00,000 --> 00:00:01,250\nHello world.\n\n2\n00:00:01,750 --> 00:00:04,500\nGoodbye.\n",
  );
});

test("plain caption lines are distributed across the full scene duration", () => {
  const media = project();
  media.captions = "One\nTwo words";
  assert.equal(
    buildSrt(media),
    "1\n00:00:00,000 --> 00:00:01,000\nOne\n\n2\n00:00:01,000 --> 00:00:04,000\nTwo words\n",
  );
});

test("explicit SRT preserves timing and multiline content while normalizing numbering", () => {
  const media = project();
  media.captions =
    "7\r\n00:00:00.100 --> 00:00:01,000\r\nFirst line\r\nSecond line\r\n\r\n9\r\n00:00:01,000 --> 00:00:04,000\r\nLast";
  assert.equal(
    buildSrt(media),
    "1\n00:00:00,100 --> 00:00:01,000\nFirst line\nSecond line\n\n2\n00:00:01,000 --> 00:00:04,000\nLast\n",
  );
});

test("subtitle validation rejects overlap, reversed ranges, invalid timestamps, and duration overflow", () => {
  for (const captions of [
    "1\n00:00:00,000 --> 00:00:02,000\nFirst\n\n2\n00:00:01,000 --> 00:00:03,000\nSecond",
    "1\n00:00:02,000 --> 00:00:01,000\nReversed",
    "1\n00:99:00,000 --> 00:99:01,000\nInvalid",
    "1\n00:00:00,000 --> 00:00:04,001\nToo long",
  ])
    assert.throws(() => buildSrt({ ...project(), captions }));
  assert.throws(() => buildSrt({ ...project(), scenes: [] }), /scenes/);
  assert.throws(() =>
    buildSrt({
      ...project(),
      scenes: [{ ...project().scenes[0], duration: 0 }],
    }),
  );
});

test("slide rendering honors actual colors, position, font size, and explicit newlines", async () => {
  const calls: {
    text: string;
    x: number;
    y: number;
    font: string;
    color: string;
  }[] = [];
  const fills: string[] = [];
  const context = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    fillRect() {
      fills.push(this.fillStyle);
    },
    measureText(text: string) {
      return { width: text.length * 20 };
    },
    fillText(text: string, x: number, y: number) {
      calls.push({ text, x, y, font: this.font, color: this.fillStyle });
    },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      fonts: { ready: Promise.resolve() },
      createElement: () => ({ getContext: () => context }),
    },
  });
  try {
    const canvas = await renderSlide(project().slides[0]);
    assert.equal(canvas.width, 1080);
    assert.equal(canvas.height, 1350);
    assert.deepEqual(fills, ["#fff8e8"]);
    assert.deepEqual(calls[0], {
      text: "A headline",
      x: 108,
      y: 270,
      font: "700 60px Manrope, sans-serif",
      color: "#123456",
    });
    assert.ok(
      calls.some(
        (call) =>
          call.text === "Second paragraph." &&
          call.font === "400 33px Inter, sans-serif",
      ),
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("DOCX export contains real written paragraphs and revision label and imports as text", async () => {
  let downloaded: Blob | undefined;
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => ({ click() {} }) },
  });
  URL.createObjectURL = (blob: Blob) => {
    downloaded = blob;
    return "blob:test";
  };
  URL.revokeObjectURL = () => {};
  try {
    await exportContentDocument(
      "A real document",
      "First line.\nSecond paragraph.\nUnicode: café ✓",
      3,
      "docx",
    );
    assert.ok(downloaded);
    assert.ok(downloaded.size > 1000);
    const imported = await importDocx(new File([downloaded], "document.docx"));
    assert.match(imported, /A real document/);
    assert.match(imported, /Revision 3/);
    assert.match(imported, /First line\.\s+Second paragraph\./);
    assert.match(imported, /café ✓/);
  } finally {
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
