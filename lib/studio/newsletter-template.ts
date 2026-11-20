import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
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

export async function renderNewsletterTemplate(bytes: Uint8Array, title: string, text: string, now = new Date()) {
  const { zip, document, body } = await openTemplate(bytes);
  const original = Array.from(body.childNodes).filter((node): node is Element => node.nodeType === 1);
  const pText = (p: Element) => Array.from(p.getElementsByTagNameNS(word, "t")).map((node) => node.textContent).join("");
  const pStyle = (p: Element) => p.getElementsByTagNameNS(word, "pStyle").item(0)?.getAttributeNS(word, "val");
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
  if (titleAt >= 0) {
    const byline = original.slice(titleAt + 1, titleAt + 5).find((item) =>
      item.localName === "p" && /^By\s+.+\[X\]\s+min read/i.test(pText(item).trim()));
    if (byline) body.appendChild(replaceText(byline, pText(byline).replace(/\[X\]/i, String(readTime))));
  }

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((line) => line.trim());
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading && index === first && heading[1].trim().toLowerCase() === title.trim().toLowerCase()) continue;
    const value = heading ? heading[1] : line.replace(/^[-*]\s+/, "• ");
    body.appendChild(paragraph(value, heading ? "Heading2" : "Normal"));
  }
  const section = original.find((item) => item.localName === "sectPr");
  if (section) body.appendChild(section);
  zip.file("word/document.xml", new XMLSerializer().serializeToString(document));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
