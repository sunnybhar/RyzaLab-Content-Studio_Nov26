import {documentLayoutSchema,type DocumentLayout} from "./document-layout";
import { z } from "zod";
import { slideLayersSchema } from "./layers";
import type { MediaProject, Package, Scene, Slide } from "./types";

// The editable source is deliberately versioned independently of application state.
const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const MAX_DOCUMENT_CHARS = 1_000_000;
const rasterData =
  /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const assetSource = z
  .string()
  .max(24 * 1024 * 1024)
  .refine((value) => {
    if (value.startsWith("data:")) return rasterData.test(value);
    if (/^[\u0000-\u0020]|[\u0000-\u001f]/.test(value)) return false;
    try {
      const url = new URL(value, "https://studio.invalid");
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use an embedded raster image or an HTTP asset URL.");
const referenceSource = z
  .string()
  .max(24 * 1024 * 1024)
  .refine((value) => {
    if (value.startsWith("data:"))
      return /^data:(?:image\/(?:png|jpeg|webp|gif)|audio\/(?:mpeg|mp3|wav|ogg|webm)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]+={0,2}$/.test(
        value,
      );
    if (/[\u0000-\u0020]/.test(value)) return false;
    try {
      const url = new URL(value, "https://studio.invalid");
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use an HTTP media reference or an embedded media file.");
const color = z
  .string()
  .regex(
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    "Use a hex color.",
  );
const slideSchema = z
  .object({
    layers: slideLayersSchema.optional(),
    id: z.string().min(1).max(200),
    title: z.string().max(2000),
    body: z.string().max(20000),
    image: assetSource.optional(),
    color,
    background: color,
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100),
    fontSize: z.number().finite().min(12).max(180),
  })
  .strict();
const sceneSchema = z
  .object({
    id: z.string().min(1).max(200),
    title: z.string().max(2000),
    script: z.string().max(20000),
    duration: z.number().finite().min(0.001).max(3600),
    sourceUrl: referenceSource.optional(),
    audioUrl: referenceSource.optional(),
    preserveAudio: z.boolean(),
  })
  .strict();
export const mediaProjectSchema = z
  .object({
    slides: z.array(slideSchema).max(100),
    scenes: z.array(sceneSchema).max(100),
    imagePrompt: z.string().max(20000),
    imageUrl: assetSource.optional(),
    narration: z.string().max(100000),
    captions: z.string().max(100000),
    aspect: z.enum(["9:16", "16:9", "1:1"]),
    templateId: z.string().max(200).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.scenes.reduce((sum, scene) => sum + scene.duration, 0) > 86400)
      ctx.addIssue({
        code: "custom",
        message: "The project may not exceed 24 hours.",
        path: ["scenes"],
      });
    for (const key of ["slides", "scenes"] as const)
      if (new Set(value[key].map((item) => item.id)).size !== value[key].length)
        ctx.addIssue({
          code: "custom",
          message: "Item IDs must be unique.",
          path: [key],
        });
  });
const sourceSchema = z
  .object({
    format: z.literal("ryzalab-media"),
    version: z.literal(1),
    project: mediaProjectSchema,
  })
  .strict();

function filename(title: string) {
  return (
    title
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/^\.+|[. ]+$/g, "")
      .trim()
      .slice(0, 100) || "content"
  );
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadImageAsset(source:string) { download(await assetBlob(source), "ryzalab-concept.png"); }
export function serializeProject(media: MediaProject): string {
  const output = JSON.stringify(
    {
      format: "ryzalab-media",
      version: 1,
      project: mediaProjectSchema.parse(media),
    },
    null,
    2,
  );
  if (new TextEncoder().encode(output).byteLength > MAX_SOURCE_BYTES)
    throw new Error("Project source exceeds the 32 MB limit.");
  return output;
}
export function exportProject(media: MediaProject): void {
  download(
    new Blob([serializeProject(media)], { type: "application/json" }),
    "media-project.json",
  );
}
export function importProject(text: string): MediaProject {
  if (new TextEncoder().encode(text).byteLength > MAX_SOURCE_BYTES)
    throw new Error("Project source exceeds the 32 MB limit.");
  let source: unknown;
  try {
    source = JSON.parse(text);
  } catch {
    throw new Error("The project file is not valid JSON.");
  }
  const parsed = sourceSchema.safeParse(source);
  if (!parsed.success)
    throw new Error(
      `Invalid project: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .slice(0, 3)
        .join("; ")}`,
    );
  return parsed.data.project;
}

/** Raster embedding and same-origin assets keep exported canvases origin-clean. */
export function assertSafeAsset(
  source: string,
  origin: string,
  kind: "image" | "media" = "image",
): void {
  if (source.startsWith("data:")) {
    const allowed =
      kind === "image"
        ? rasterData
        : /^data:(?:image\/(?:png|jpeg|webp|gif)|audio\/(?:mpeg|mp3|wav|ogg|webm)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]+={0,2}$/;
    if (!allowed.test(source))
      throw new Error(
        "Unsupported embedded asset. Use a raster image, audio, or video file.",
      );
    return;
  }
  let url: URL;
  try {
    url = new URL(source, origin);
  } catch {
    throw new Error("Invalid asset URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== origin ||
    url.username ||
    url.password
  )
    throw new Error(
      "Export requires embedded or same-origin assets. Import the external asset first.",
    );
}
async function assetBlob(
  source: string,
  kind: "image" | "media" = "image",
): Promise<Blob> {
  assertSafeAsset(source, window.location.origin, kind);
  const headers: Record<string, string> = {};
  if (source.startsWith("/api/studio/assets")) {
    const { supabase } = await import("../supabase");
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session)
        headers.authorization = `Bearer ${data.session.access_token}`;
    }
  }
  const response = await fetch(source, {
    credentials: "same-origin",
    redirect: "error",
    headers,
  });
  if (!response.ok)
    throw new Error(`Could not load export asset (${response.status}).`);
  const blob = await response.blob();
  const valid =
    kind === "image"
      ? /^image\/(png|jpeg|webp|gif)$/
      : /^(image\/(png|jpeg|webp|gif)|audio\/[\w.+-]+|video\/(mp4|webm))$/;
  if (!valid.test(blob.type))
    throw new Error("The asset does not have a supported media content type.");
  if (blob.size > 32 * 1024 * 1024)
    throw new Error("An export asset exceeds the 32 MB limit.");
  return blob;
}
async function loadImage(
  source: string,
): Promise<{ image: HTMLImageElement; dispose: () => void }> {
  const blob = await assetBlob(source);
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40_000_000)
      throw new Error("Image is too large to render.");
    return { image, dispose: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error(
      `Could not decode the slide image: ${error instanceof Error ? error.message : "unsupported image"}`,
    );
  }
}
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const output: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (ctx.measureText(line ? `${line} ${word}` : word).width <= maxWidth) {
        line = line ? `${line} ${word}` : word;
        continue;
      }
      if (line) {
        output.push(line);
        line = "";
      }
      // Break long URLs/words so the composition stays inside its text layer.
      for (const letter of word) {
        if (line && ctx.measureText(line + letter).width > maxWidth) {
          output.push(line);
          line = "";
        }
        line += letter;
      }
    }
    output.push(line);
  }
  return output;
}
export async function renderSlide(slide: Slide): Promise<HTMLCanvasElement> {
  slideSchema.parse(slide);
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot render slide exports.");
  ctx.fillStyle = slide.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (slide.image) {
    const loaded = await loadImage(slide.image);
    try {
      const image = loaded.image;
      const scale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      );
      ctx.drawImage(
        image,
        (canvas.width - image.naturalWidth * scale) / 2,
        (canvas.height - image.naturalHeight * scale) / 2,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      );
    } finally {
      loaded.dispose();
    }
  }
  // x/y are the editor's percentage positions, while fontSize uses export pixels.
  const x = (slide.x / 100) * canvas.width;
  let y = (slide.y / 100) * canvas.height;
  const width = Math.max(1, canvas.width - x - 40);
  ctx.fillStyle = slide.color;
  ctx.textBaseline = "top";
  ctx.font = `700 ${slide.fontSize}px Manrope, sans-serif`;
  for (const line of wrapText(ctx, slide.title, width)) {
    ctx.fillText(line, x, y);
    y += slide.fontSize * 1.2;
  }
  y += slide.fontSize * 0.4;
  ctx.font = `400 ${slide.fontSize * 0.55}px Inter, sans-serif`;
  for (const line of wrapText(ctx, slide.body, width)) {
    ctx.fillText(line, x, y);
    y += slide.fontSize * 0.55 * 1.5;
  }
  for (const layer of slide.layers || []) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    const lx = (layer.x / 100) * canvas.width,
      ly = (layer.y / 100) * canvas.height,
      lw = (layer.width / 100) * canvas.width,
      lh = (layer.height / 100) * canvas.height;
    ctx.beginPath();
    ctx.rect(lx, ly, lw, lh);
    ctx.clip();
    if (layer.kind === "shape") {
      ctx.fillStyle = layer.fill;
      if (layer.shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(
          lx + lw / 2,
          ly + lh / 2,
          lw / 2,
          lh / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else ctx.fillRect(lx, ly, lw, lh);
    } else {
      ctx.fillStyle = layer.color;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "top";
      ctx.font = `${layer.weight} ${layer.fontSize}px Inter, sans-serif`;
      let lineY = ly;
      const textX =
        layer.align === "center"
          ? lx + lw / 2
          : layer.align === "right"
            ? lx + lw
            : lx;
      for (const line of wrapText(ctx, layer.text, lw)) {
        ctx.fillText(line, textX, lineY);
        lineY += layer.fontSize * 1.2;
      }
    }
    ctx.restore();
  }
  return canvas;
}
function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("The browser could not encode this slide.")),
        "image/png",
      );
    } catch {
      reject(
        new Error(
          "The slide contains an unsafe asset. Import external images before export.",
        ),
      );
    }
  });
}
export async function exportSlides(
  slides: Slide[],
  format: "png" | "pdf",
): Promise<void> {
  if (!slides.length)
    throw new Error("Add at least one slide before exporting.");
  z.array(slideSchema).max(100).parse(slides);
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      unit: "px",
      format: [1080, 1350],
      hotfixes: ["px_scaling"],
    });
    for (let index = 0; index < slides.length; index++) {
      const canvas = await renderSlide(slides[index]);
      if (index) pdf.addPage([1080, 1350]);
      try {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 1080, 1350);
      } catch {
        throw new Error(
          "Could not encode slide PDF. Import any external assets first.",
        );
      }
    }
    pdf.save("slides.pdf");
    return;
  }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let index = 0; index < slides.length; index++)
    zip.file(
      `slide-${String(index + 1).padStart(2, "0")}.png`,
      await (await canvasBlob(await renderSlide(slides[index]))).arrayBuffer(),
    );
  download(await zip.generateAsync({ type: "blob" }), "slides.zip");
}

function validateDocument(title: string, text: string, revision: number) {
  if (!Number.isInteger(revision) || revision < 1)
    throw new Error("A positive revision number is required.");
  if (title.length > 2000 || text.length > MAX_DOCUMENT_CHARS)
    throw new Error("Document exceeds the export size limit.");
}
export async function exportContentDocument(
  title: string,
  text: string,
  revision: number,
  format: "docx" | "pdf",
  options?: {imageUrl?:string;imageCaption?:string;layout?:DocumentLayout;onExported?:(result:{pages?:number;format:"pdf"|"docx"})=>void},
): Promise<void> {
  validateDocument(title, text, revision);
  const layout=options?.layout?documentLayoutSchema.parse(options.layout):undefined;
  const name = `${filename(title)}-revision-${revision}`;
  let hero:{data:Uint8Array;url:string;width:number;height:number}|undefined;
  if(options?.imageUrl){const loaded=await loadImage(options.imageUrl);try{const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=Math.min(750,Math.round(1200*loaded.image.naturalHeight/loaded.image.naturalWidth));const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image rendering unavailable.");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/loaded.image.naturalWidth,canvas.height/loaded.image.naturalHeight);const width=loaded.image.naturalWidth*scale,height=loaded.image.naturalHeight*scale;ctx.drawImage(loaded.image,(canvas.width-width)/2,(canvas.height-height)/2,width,height);const url=canvas.toDataURL("image/jpeg",0.9);hero={data:Uint8Array.from(atob(url.split(",")[1]),char=>char.charCodeAt(0)),url,width:560,height:Math.round(canvas.height*560/1200)};}finally{loaded.dispose();}}

  if (format === "docx") {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Header, Footer } =
      await import("docx");
    const document = new Document({
      creator: "RyzaLab",
      styles:{default:{document:{run:{font:layout?.font||"Arial",size:(layout?.bodySize||11)*2},paragraph:{spacing:{after:140,line:layout?Math.round(layout.lineSpacing*240):280}}}}},
      title,
      description: `Revision ${revision}`,
      sections: [
        {
          ...(layout?{properties:{page:{size:layout.pageSize==="A4"?{width:11906,height:16838}:{width:12240,height:15840},margin:{top:Math.round(layout.marginMm*1440/25.4),bottom:Math.round(layout.marginMm*1440/25.4),left:Math.round(layout.marginMm*1440/25.4),right:Math.round(layout.marginMm*1440/25.4)}}},headers:{default:new Header({children:[new Paragraph(layout.header)]})},footers:{default:new Footer({children:[new Paragraph(layout.footer)]})}}:{}),
          children: [
            new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
            new Paragraph({
              children: [
                new TextRun({ text: `Revision ${revision}`, italics: true }),
              ],
            }),
            ...(hero?[new Paragraph({children:[new ImageRun({type:"jpg",data:hero.data,transformation:{width:hero.width,height:hero.height}})]}),...(options?.imageCaption?[new Paragraph({text:options.imageCaption})]:[])]:[]),
            ...text
              .replace(/\r\n?/g, "\n")
              .split("\n")
              .map((line) => new Paragraph(/^#{1,3}\s/.test(line)?{text:line.replace(/^#{1,3}\s/,""),heading:HeadingLevel.HEADING_2}:{text:line})),
          ],
        },
      ],
    });
    download(await Packer.toBlob(document), `${name}.docx`);
    options?.onExported?.({format:"docx"});
    return;
  }
  await document.fonts.ready;
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({format:layout?.pageSize==="Letter"?"letter":"a4"});
  // Rasterize installed browser fonts so Unicode and wrapping match the editor.
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = layout?.pageSize==="Letter"?1605:1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot render document PDFs.");
  const margin = layout?Math.round(layout.marginMm*canvas.width/(layout.pageSize==="Letter"?215.9:210)):118;
  let y = margin;
  let page = 0;
  const clear = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#172d30";
    ctx.textBaseline = "top";
    if(layout){ctx.font=`400 18px ${layout.font}`;ctx.fillText(layout.header,margin,28);ctx.fillText(layout.footer,margin,canvas.height-42);}

  };
  const flush = () => {
    if (page++) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
  };
  const line = (value: string, size: number, height: number) => {
    ctx.font = `400 ${size}px ${layout?.font||"Inter"}, sans-serif`;
    const rows = wrapText(ctx, value, canvas.width - margin * 2);
    for (const row of rows) {
      if (y + height > canvas.height - margin) {
        flush();
        clear();
        y = margin;
        ctx.font = `400 ${size}px ${layout?.font||"Inter"}, sans-serif`;
      }
      ctx.fillText(row, margin, y);
      y += height;
    }
  };
  clear();
  line(title, 40, 52);
  line(`Revision ${revision}`, 22, 34);
  y += 24;
  if(hero){const height=hero.height*(canvas.width-margin*2)/hero.width;ctx.drawImage(await (async()=>{const image=new Image();image.src=hero.url;await image.decode();return image;})(),margin,y,canvas.width-margin*2,height);y+=height+24;if(options?.imageCaption)line(options.imageCaption,20,30);}
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n"))
    /^#{1,3}\s/.test(paragraph)?line(paragraph.replace(/^#{1,3}\s/,""),30,44):line(paragraph,layout?layout.bodySize*2.08:24,layout?layout.bodySize*2.08*layout.lineSpacing:38);
  flush();
  pdf.save(`${name}.pdf`);
  options?.onExported?.({format:"pdf",pages:pdf.getNumberOfPages()});
}
export async function importDocx(file: File): Promise<string> {
  if (!/\.docx$/i.test(file.name)) throw new Error("Choose a DOCX file.");
  if (file.size > 16 * 1024 * 1024)
    throw new Error("DOCX import is limited to 16 MB.");
  const mammoth = await import("mammoth");
  // Plain text avoids interpreting untrusted document HTML or following links.
  const arrayBuffer = await file.arrayBuffer();
  // Both inputs use the same bytes: browser bundlers use arrayBuffer, Node uses buffer.
  const input = { arrayBuffer, buffer: new Uint8Array(arrayBuffer) };
  const result = await mammoth.extractRawText(input);
  if (result.value.length > MAX_DOCUMENT_CHARS)
    throw new Error("Imported document exceeds the text limit.");
  return result.value;
}

function srtTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3600000),
    minutes = Math.floor(milliseconds / 60000) % 60,
    seconds = Math.floor(milliseconds / 1000) % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(milliseconds % 1000).padStart(3, "0")}`;
}
function parseTime(value: string): number {
  const match = /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value);
  if (!match) throw new Error("Invalid subtitle timestamp.");
  return (
    Number(match[1]) * 3600000 +
    Number(match[2]) * 60000 +
    Number(match[3]) * 1000 +
    Number(match[4])
  );
}
export function buildSrt(media: MediaProject): string {
  const scenes = z
    .array(sceneSchema)
    .min(1, "Add scenes before exporting subtitles.")
    .max(100)
    .parse(media.scenes);
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total > 86400) throw new Error("Video duration exceeds 24 hours.");
  const totalMs = Math.round(total * 1000);
  const captions = media.captions.trim();
  let cues: { start: number; end: number; text: string }[] = [];
  if (captions.includes("-->")) {
    for (const block of captions.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
      const lines = block.trim().split("\n");
      if (/^\d+$/.test(lines[0])) lines.shift();
      const timing = /^(\S+)\s+-->\s+(\S+)$/.exec(lines.shift() || "");
      if (!timing || !lines.join("\n").trim())
        throw new Error("Invalid SRT cue.");
      cues.push({
        start: parseTime(timing[1]),
        end: parseTime(timing[2]),
        text: lines.join("\n").trim(),
      });
    }
  } else if (captions) {
    const lines = captions
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const weight = lines.reduce((sum, line) => sum + line.length, 0);
    let used = 0;
    cues = lines.map((text, index) => {
      const start = Math.round((used / weight) * totalMs);
      used += text.length;
      return {
        start,
        end:
          index === lines.length - 1
            ? totalMs
            : Math.round((used / weight) * totalMs),
        text,
      };
    });
  } else {
    let elapsed = 0;
    cues = scenes.flatMap((scene: Scene) => {
      const start = Math.round(elapsed * 1000);
      elapsed += scene.duration;
      return scene.script.trim()
        ? [
            {
              start,
              end: Math.round(elapsed * 1000),
              text: scene.script.trim(),
            },
          ]
        : [];
    });
  }
  if (!cues.length)
    throw new Error(
      "Add captions or scene scripts before exporting subtitles.",
    );
  let previousEnd = 0;
  return cues
    .map((cue, index) => {
      if (cue.start < previousEnd || cue.end <= cue.start || cue.end > totalMs)
        throw new Error(
          "Subtitle timings must be ordered, non-overlapping, positive, and within the video duration.",
        );
      previousEnd = cue.end;
      return `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`;
    })
    .join("\n");
}
export function exportSubtitles(media: MediaProject): void {
  download(
    new Blob([buildSrt(media)], { type: "application/x-subrip;charset=utf-8" }),
    "captions.srt",
  );
}

export async function buildPostPackage(pkg: Package): Promise<Blob> {
  if (!pkg.approvedBy || !pkg.approvedAt || !pkg.hash)
    throw new Error("Select an approved package before exporting.");
  validateDocument(pkg.title, pkg.text, pkg.revision);
  const source = serializeProject(pkg.media);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file("package.json", JSON.stringify(pkg, null, 2));
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        id: pkg.id,
        contentId: pkg.contentId,
        channel: pkg.channel,
        account: pkg.account,
        title: pkg.title,
        revision: pkg.revision,
        metadata: pkg.metadata,
        workflowId: pkg.workflowId,
        ruleVersion: pkg.ruleVersion,
        approvedBy: pkg.approvedBy,
        approvedAt: pkg.approvedAt,
        hash: pkg.hash,
      },
      null,
      2,
    ),
  );
  zip.file(
    "content.txt",
    `${pkg.title}\nRevision ${pkg.revision}\n\n${pkg.text}`,
  );
  zip.file("media-project.json", source);
  if (
    pkg.media.scenes.length &&
    (pkg.media.captions.trim() ||
      pkg.media.scenes.some((scene) => scene.script.trim()))
  )
    zip.file("captions.srt", buildSrt(pkg.media));
  for (let index = 0; index < pkg.media.slides.length; index++)
    zip.file(
      `slides/slide-${String(index + 1).padStart(2, "0")}.png`,
      await (
        await canvasBlob(await renderSlide(pkg.media.slides[index]))
      ).arrayBuffer(),
    );
  const assets = [
    pkg.media.imageUrl,
    ...pkg.media.slides.map((slide) => slide.image),
    ...pkg.media.scenes.flatMap((scene) => [scene.sourceUrl, scene.audioUrl]),
  ].filter((url): url is string => Boolean(url));
  const manifest: { source: string; path: string; type: string }[] = [];
  for (const [index, source] of [...new Set(assets)].entries()) {
    const blob = await assetBlob(source, "media");
    const suffix =
      (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "video/mp4": "mp4",
          "video/webm": "webm",
          "audio/mpeg": "mp3",
          "audio/wav": "wav",
          "audio/ogg": "ogg",
          "audio/webm": "webm",
        } as Record<string, string>
      )[blob.type] || "bin";
    const path = `assets/asset-${index + 1}.${suffix}`;
    zip.file(path, await blob.arrayBuffer());
    manifest.push({
      source: source.startsWith("data:") ? "embedded" : source,
      path,
      type: blob.type,
    });
  }
  zip.file("assets/manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "README.txt",
    "Approved package snapshot. media-project.json is editable source; assets/manifest.json maps original media to included files. Scene source clips are source media, not a rendered final video. No MP4 was generated by this export.\n",
  );
  return zip.generateAsync({ type: "blob" });
}
export async function exportPostPackage(pkg: Package): Promise<void> {
  download(
    await buildPostPackage(pkg),
    `${filename(pkg.title)}-revision-${pkg.revision}-package.zip`,
  );
}
