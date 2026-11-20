import type { JSZipObject, JSZipStreamHelper } from "jszip";

export const voiceDocumentLimit = 262144;
export const localVoicePdfLimit = 128 * 1024 * 1024;

function extractEntry(entry: JSZipObject, limit: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // JSZip exposes this browser stream, but omits it from JSZipObject's declaration.
    const document = entry as JSZipObject & {
      internalStream(type: "uint8array"): JSZipStreamHelper<Uint8Array>;
    };
    const stream = document.internalStream("uint8array");
    const chunks: Uint8Array[] = [];
    let size = 0;
    stream.on("data", (chunk: Uint8Array) => {
      size += chunk.byteLength;
      if (size > limit) {
        stream.pause();
        reject(new Error(limit === localVoicePdfLimit ? "PDF exceeds 128 MB." : "Document exceeds 256 KB."));
        return;
      }
      chunks.push(chunk);
    }).on("error", reject).on("end", () => {
      const result = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(result);
    }).resume();
  });
}

export async function* voiceArchiveEntries(file: File, local = false) {
  if (!file.size || file.size > 256 * 1024 * 1024)
    throw new Error("Choose a nonempty ZIP up to 256 MB. Split larger archives into smaller ZIPs.");
  const { default: JSZip } = await import("jszip");
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const documents = Object.values(archive.files).filter((entry) => {
    const parts = entry.name.split("/");
    return !entry.dir && !parts.some((part) => part.startsWith(".") || part === "__MACOSX") &&
      /\.(?:md|txt|html?|docx|pdf)$/i.test(entry.name);
  });
  if (!documents.length) throw new Error("No Markdown, text, HTML, DOCX or PDF documents were found.");
  if (documents.length > 100) throw new Error("Use a ZIP containing at most 100 documents.");
  for (const entry of documents) {
    const fileName = entry.name.split("/").at(-1)!;
    try {
      yield { fileName, bytes: await extractEntry(entry, local && /\.pdf$/i.test(fileName) ? localVoicePdfLimit : voiceDocumentLimit) };
    } catch (cause) {
      yield { fileName, error: cause instanceof Error ? cause.message : "Could not read the document." };
    }
  }
}

export function voiceArchiveText(fileName: string, bytes: Uint8Array) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!/\.html?$/i.test(fileName)) return { text: text.trim() };
  const document = new DOMParser().parseFromString(text, "text/html");
  const title = document.querySelector("article h1, main h1, h1, title")?.textContent?.trim();
  const article = document.querySelector("article, main") ?? document.body;
  article.querySelectorAll("script, style, nav, footer, aside, noscript").forEach((node) => node.remove());
  article.querySelectorAll("p, h1, h2, h3, h4, li, blockquote, br").forEach((node) => node.append("\n"));
  return { title, text: article.textContent?.trim() ?? "" };
}
