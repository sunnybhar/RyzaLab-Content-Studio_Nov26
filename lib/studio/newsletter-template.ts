import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
import { newsletterBlocks, newsletterHeading, type NewsletterSection } from "./newsletter-outline";
import { StudioError } from "./permissions";

export const newsletterTemplateLimit = 8 * 1024 * 1024;
const word = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const xml = "http://www.w3.org/XML/1998/namespace";

function parsePart(source: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw new StudioError(400, "External XML definitions are unsupported in newsletter templates.");
  const fail = () => { throw new StudioError(400, "The Word template contains malformed XML."); };
  return new DOMParser({ errorHandler: { warning: () => {}, error: fail, fatalError: fail } })
    .parseFromString(source, "application/xml");
}

async function openTemplate(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > newsletterTemplateLimit)
    throw new StudioError(400, "Choose a Word DOCX template up to 8 MB.");
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new StudioError(400, "This file is not a readable Word DOCX template.");
  }
  let expanded = 0;
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > 300)
    throw new StudioError(400, "This DOCX contains too many files to use as a template.");
  for (const entry of entries) {
    const info = entry as typeof entry & { _data?: { uncompressedSize?: number } };
    const size = info._data?.uncompressedSize;
    if (!Number.isSafeInteger(size) || size! < 0 || (expanded += size!) > 40 * 1024 * 1024)
      throw new StudioError(400, "The expanded Word template exceeds 40 MB.");
    if (/(?:^|\/)(?:embeddings|activeX|externalLinks)\/|vbaProject|\.exe$/i.test(entry.name))
      throw new StudioError(400, "Use a standard DOCX without macros or embedded objects.");
    if (!/\.(?:xml|rels)$/i.test(entry.name)) continue;
    const source = await entry.async("string");
    const document = parsePart(source);
    if (/<(?:[\w.-]+:)?(?:altChunk|object|control)\b|\b(?:DDEAUTO|DDE|INCLUDETEXT|INCLUDEPICTURE|LINK)\s*"/i.test(source) ||
        Array.from(document.getElementsByTagNameNS(word, "instrText")).some((node) =>
          /\b(?:DDEAUTO|DDE|INCLUDETEXT|INCLUDEPICTURE|LINK)\b/i.test(node.textContent || "")))
      throw new StudioError(400, "Remove external fields and embedded objects from the Word template.");
    if (entry.name.endsWith(".rels") &&
      Array.from(document.getElementsByTagNameNS("*", "Relationship")).some((node) =>
        node.getAttribute("TargetMode")?.toLowerCase() === "external" &&
        (!node.getAttribute("Type")?.endsWith("/hyperlink") ||
          !/^https?:\/\//i.test(node.getAttribute("Target") || ""))))
      throw new StudioError(400, "Remove linked files from the Word template. Embed artwork in the DOCX.");
  }
  const source = await zip.file("word/document.xml")?.async("string");
  if (!source || !zip.file("[Content_Types].xml"))
    throw new StudioError(400, "This archive does not contain a Word document.");
  const document = parsePart(source);
  const body = document.getElementsByTagNameNS(word, "body").item(0);
  if (!body) throw new StudioError(400, "The Word template has no document body.");
  return { zip, document, body };
}

export async function validateNewsletterTemplate(bytes: Uint8Array) {
  await openTemplate(bytes);
}

const elements = (node: Element) => Array.from(node.childNodes).filter((child): child is Element => child.nodeType === 1);
const pText = (node: Element) => Array.from(node.getElementsByTagNameNS(word, "t")).map((text) => text.textContent).join("");
const pStyle = (node: Element) => node.getElementsByTagNameNS(word, "pStyle").item(0)?.getAttributeNS(word, "val");

function templateSections(body: Element) {
  const sections: Array<{ outline: NewsletterSection; paragraph: Element; table?: Element }> = [];
  for (const node of elements(body)) {
    if (node.localName === "p" && /^heading\d+$/i.test(pStyle(node) || "")) {
      const heading = pText(node).trim();
      if (/^(?:about this template|before you publish|when to use this template)$/i.test(heading)) {
        if (sections.length) break;
        continue;
      }
      if (heading) sections.push({ outline: { heading }, paragraph: node });
    } else if (node.localName === "tbl") {
      const section = sections.at(-1);
      const header = elements(node).find((element) => element.localName === "tr");
      const columns = header && elements(header).filter((element) => element.localName === "tc").map((cell) => pText(cell).trim());
      if (section && !section.table && columns?.length && columns.every(Boolean)) {
        section.table = node;
        section.outline.columns = columns;
      }
    }
  }
  return sections;
}

export async function newsletterTemplateOutline(bytes: Uint8Array) {
  const { body } = await openTemplate(bytes);
  return templateSections(body).map((section) => section.outline);
}

export async function newsletterWritingGuidance(bytes: Uint8Array) {
  const { body } = await openTemplate(bytes);
  const lines = Array.from(body.getElementsByTagNameNS(word, "p")).flatMap((paragraph) => {
    const value = pText(paragraph).trim();
    if (!value) return [];
    return [/^heading/i.test(pStyle(paragraph) || "") ? `## ${value}` : value];
  });
  if (!lines.length) throw new StudioError(400, "This newsletter template has no readable writing guidance.");
  return { guidance: lines.join("\n").slice(0, 12000), sections: templateSections(body).map((section) => section.outline) };
}

type NewsletterImage = { bytes: Uint8Array; alt?: string; caption?: string };

async function embedNewsletterImage(zip: JSZip, document: Document, image: NewsletterImage) {
  const bytes = Buffer.from(image.bytes);
  if (bytes.length < 33 || bytes.length > 50 * 1024 * 1024 ||
      !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.toString("ascii", 12, 16) !== "IHDR")
    throw new StudioError(409, "The attached Studio image is not a readable PNG.");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height) throw new StudioError(409, "The attached image has invalid dimensions.");
  const scale = Math.min(5.8 * 914400 / width, 3.5 * 914400 / height);
  const cx = Math.max(1, Math.round(width * scale)), cy = Math.max(1, Math.round(height * scale));
  const packageRelationships = "http://schemas.openxmlformats.org/package/2006/relationships";
  const officeRelationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const wp = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const relPath = "word/_rels/document.xml.rels";
  const rels = parsePart(await zip.file(relPath)?.async("string") ?? `<Relationships xmlns="${packageRelationships}"/>`);
  const usedIds = new Set(elements(rels.documentElement!).map((item) => item.getAttribute("Id")));
  let index = 1;
  while (usedIds.has(`rIdStudioImage${index}`) || zip.file(`word/media/studio-image-${index}.png`)) index++;
  const id = `rIdStudioImage${index}`;
  const path = `media/studio-image-${index}.png`;
  const relationship = rels.createElementNS(packageRelationships, "Relationship");
  relationship.setAttribute("Id", id);
  relationship.setAttribute("Type", `${officeRelationships}/image`);
  relationship.setAttribute("Target", path);
  rels.documentElement!.appendChild(relationship);
  const serializer = new XMLSerializer();
  zip.file(relPath, serializer.serializeToString(rels));
  zip.file(`word/${path}`, bytes);

  const types = parsePart(await zip.file("[Content_Types].xml")!.async("string"));
  const entry = types.createElementNS(types.documentElement!.namespaceURI, "Override");
  entry.setAttribute("PartName", `/word/${path}`);
  entry.setAttribute("ContentType", "image/png");
  types.documentElement!.appendChild(entry);
  zip.file("[Content_Types].xml", serializer.serializeToString(types));

  const docIds = new Set(Array.from(document.getElementsByTagNameNS(wp, "docPr")).map((element) => element.getAttribute("id")));
  let drawingId = 1;
  while (docIds.has(String(drawingId))) drawingId++;
  const drawing = parsePart(`
    <w:p xmlns:w="${word}" xmlns:wp="${wp}" xmlns:r="${officeRelationships}"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
      xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:drawing><wp:inline>
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:docPr id="${drawingId}" name="Studio main image"/>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="Studio main image"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
          </pic:pic>
        </a:graphicData></a:graphic>
      </wp:inline></w:drawing></w:r>
    </w:p>`);
  const properties = drawing.getElementsByTagNameNS(wp, "docPr").item(0);
  if (image.alt) properties?.setAttribute("descr", image.alt);
  return document.importNode(drawing.documentElement!, true);
}

export async function renderNewsletterTemplate(bytes: Uint8Array, title: string, text: string, now = new Date(), image?: NewsletterImage) {
  const { zip, document, body } = await openTemplate(bytes);
  const sections = templateSections(body);
  const original = elements(body);
  const titleAt = original.findIndex((p) => p.localName === "p" &&
    (pStyle(p)?.toLowerCase() === "title" || /^\[(?:headline|title)\b/i.test(pText(p).trim()) ||
      /\{\{\s*title\s*\}\}/i.test(pText(p))));
  const make = (name: string) => document.createElementNS(word, "w:" + name);

  function run(value: string, bold = false) {
    const result = make("r");
    if (bold) {
      const style = make("rPr");
      style.appendChild(make("b"));
      result.appendChild(style);
    }
    const text = make("t");
    text.setAttributeNS(xml, "xml:space", "preserve");
    text.appendChild(document.createTextNode(value));
    result.appendChild(text);
    return result;
  }

  function paragraph(value: string, style?: string) {
    const p = make("p");
    if (style) {
      const props = make("pPr");
      const pStyle = make("pStyle");
      pStyle.setAttributeNS(word, "w:val", style);
      props.appendChild(pStyle);
      p.appendChild(props);
    }
    value.split(/(\*\*[^*]+\*\*|__[^_]+__)/).filter(Boolean).forEach((part) => {
      const bold = /^(?:\*\*|__)/.test(part);
      p.appendChild(run(bold ? part.slice(2, -2) : part, bold));
    });
    return p;
  }

  function replaceText(p: Element, value: string) {
    const copy = p.cloneNode(true) as Element;
    const runs = Array.from(copy.getElementsByTagNameNS(word, "t"));
    if (!runs.length) copy.appendChild(run(value));
    else runs.forEach((node, index) => { node.textContent = index === 0 ? value : ""; });
    return copy;
  }

  const before = titleAt >= 0 ? original.slice(0, titleAt) : original;
  const date = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(now);
  const readTime = Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
  const issueImage = image ? await embedNewsletterImage(zip, document, image) : undefined;
  while (body.firstChild) body.removeChild(body.firstChild);
  for (const item of before) {
    if (item.localName !== "p") continue;
    const value = pText(item).trim();
    if (!value && item.getElementsByTagNameNS(word, "drawing").length) {
      body.appendChild(item);
    } else if (titleAt >= 0 && /\bissue\s*\[#\]|\[MONTH DD, YYYY\]|\{\{\s*date\s*\}\}/i.test(value)) {
      const masthead = value.replace(/\s*·\s*ISSUE\s*\[#\]/i, "")
        .replace(/\[MONTH DD, YYYY\]|\{\{\s*date\s*\}\}/gi, date);
      body.appendChild(replaceText(item, masthead));
    }
  }
  body.appendChild(titleAt < 0 ? paragraph(title, "Title") : replaceText(original[titleAt], title));
  const firstLines = text.trim().split(/\r?\n/).filter((line) => line.trim()).slice(0, 2);
  const subtitle = firstLines.find((line) => /^subtitle:\s/i.test(line.trim()));
  const subtitleSlot = titleAt >= 0 ? original[titleAt + 1] : undefined;
  const hasSubtitleSlot = subtitleSlot && /^\[subtitle\b/i.test(pText(subtitleSlot).trim());
  if (titleAt >= 0) {
    if (subtitle && subtitleSlot && hasSubtitleSlot)
      body.appendChild(replaceText(subtitleSlot, subtitle.trim().replace(/^subtitle:\s*/i, "")));
    const byline = original.slice(titleAt + 1, titleAt + 5).find((item) =>
      item.localName === "p" && /^By\s+.+\[X\]\s+min read/i.test(pText(item).trim()));
    if (byline) body.appendChild(replaceText(byline, pText(byline).replace(/\[X\]/i, String(readTime))));
  }

  if (issueImage) {
    body.appendChild(issueImage);
    if (image?.caption) body.appendChild(paragraph(image.caption, "Caption"));
  }

  const blocks = newsletterBlocks(text);
  let activeSection: typeof sections[number] | undefined;
  for (const [index, block] of blocks.entries()) {
    if (block.kind === "heading") {
      if (index === 0 && newsletterHeading(block.text) === newsletterHeading(title)) continue;
      const match = sections.find((section) => newsletterHeading(section.outline.heading) === newsletterHeading(block.text));
      if (match) activeSection = match;
      body.appendChild(match ? replaceText(match.paragraph, block.text) : paragraph(block.text, "Heading2"));
    } else if (block.kind === "table") {
      const columns = activeSection?.outline.columns;
      if (activeSection?.table && columns && columns.length === block.columns.length &&
        columns.every((column, index) => newsletterHeading(column) === newsletterHeading(block.columns[index]))) {
        const table = activeSection.table.cloneNode(true) as Element;
        const rows = elements(table).filter((item) => item.localName === "tr");
        const sample = rows[1] ?? rows[0];
        rows.slice(1).forEach((row) => table.removeChild(row));
        for (const values of block.rows) {
          const row = sample.cloneNode(true) as Element;
          elements(row).filter((item) => item.localName === "tc").forEach((cell, index) => {
            const paragraphs = elements(cell).filter((item) => item.localName === "p");
            if (paragraphs[0]) cell.replaceChild(replaceText(paragraphs[0], values[index]), paragraphs[0]);
            else cell.appendChild(paragraph(values[index]));
            paragraphs.slice(1).forEach((item) => cell.removeChild(item));
          });
          table.appendChild(row);
        }
        body.appendChild(table);
      } else {
        const table = make("tbl");
        const grid = make("tblGrid");
        for (const _column of block.columns) {
          const column = make("gridCol");
          column.setAttributeNS(word, "w:w", String(Math.floor(9000 / block.columns.length)));
          grid.appendChild(column);
        }
        table.appendChild(grid);
        for (const values of [block.columns, ...block.rows]) {
          const row = make("tr");
          for (const value of values) {
            const cell = make("tc");
            cell.appendChild(paragraph(value, "Normal"));
            row.appendChild(cell);
          }
          table.appendChild(row);
        }
        body.appendChild(table);
      }
    } else if (!(index <= 1 && /^subtitle:\s/i.test(block.text) && hasSubtitleSlot)) {
      body.appendChild(paragraph(block.text.replace(/^[-*]\s+/, "• "), "Normal"));
    }
  }
  const section = original.find((item) => item.localName === "sectPr");
  if (section) body.appendChild(section);
  zip.file("word/document.xml", new XMLSerializer().serializeToString(document));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
