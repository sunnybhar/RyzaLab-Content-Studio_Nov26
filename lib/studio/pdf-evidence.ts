/** Text-only bounded PDF extraction; never executes actions, loads URLs or claims OCR. */
export async function publicPdfEvidence(bytes: Uint8Array) {
  if (
    bytes.byteLength > 524288 ||
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    throw Error("Unsupported or oversized PDF source.");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const pdf = await task.promise;
        if (pdf.numPages > 20)
          throw Error("Public PDF exceeds the 20-page extraction bound.");
        let text = "";
        let pagesRead = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const line = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          text += `[Page ${i}] ${line}\n`;
          pagesRead++;
          page.cleanup();
          if (text.length >= 16000) break;
        }
        if (text.trim().length < 100)
          throw Error(
            "PDF has insufficient searchable text; OCR was not performed.",
          );
        return {
          text: text.slice(0, 16000),
          pagesRead,
          totalPages: pdf.numPages,
        };
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(Error("PDF extraction deadline reached.")),
          6000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    await task.destroy();
  }
}
