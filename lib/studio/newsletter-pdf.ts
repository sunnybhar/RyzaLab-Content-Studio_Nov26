import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { StudioError } from "./permissions";

const execute = promisify(execFile);
const macOffice = "/Applications/LibreOffice.app/Contents/MacOS/soffice";

export async function newsletterPdf(docx: Uint8Array) {
  const directory = await mkdtemp(join(tmpdir(), "studio-newsletter-"));
  try {
    const source = join(directory, "newsletter.docx");
    await writeFile(source, docx, { mode: 0o600 });
    const office = process.env.STUDIO_SOFFICE_PATH || (existsSync(macOffice) ? macOffice : "soffice");
    try {
      await execute(office, [
        `-env:UserInstallation=${pathToFileURL(join(directory, "profile")).href}`,
        "--headless", "--nologo", "--norestore", "--convert-to", "pdf:writer_pdf_Export",
        "--outdir", directory, source,
      ], { timeout: 60000, maxBuffer: 65536, windowsHide: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new StudioError(503, "Install LibreOffice on this computer to export PDF with a Word template. DOCX export is available now.");
      throw new StudioError(502, "LibreOffice could not render this template to PDF. You can still download the Word document.");
    }
    const output = await readFile(join(directory, "newsletter.pdf")).catch(() => null);
    if (!output || output.length < 5 || output.subarray(0, 5).toString("ascii") !== "%PDF-")
      throw new StudioError(502, "LibreOffice did not produce a PDF for this template.");
    return output;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
