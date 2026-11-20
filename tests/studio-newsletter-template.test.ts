import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { newsletterWritingGuidance, renderNewsletterTemplate } from "../lib/studio/newsletter-template";

test("template export requires the ordered editorial sections and fills the original Word table", async () => {
  const zip = new JSZip();
  const paragraph = (text: string, style?: string) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t>${text}</w:t></w:r></w:p>`;
  const row = (...cells: string[]) => `<w:tr>${cells.map((cell) => `<w:tc>${paragraph(cell)}</w:tc>`).join("")}</w:tr>`;
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    ${paragraph("[Headline: short]", "Title")}
    ${paragraph("[Subtitle: one line]")}
    ${paragraph("What changed", "Heading2")}
    ${paragraph("What to check", "Heading2")}
    <w:tbl><w:tblPr><w:tblStyle w:val="OriginalStyle"/></w:tblPr>
      ${row("Check", "Result")}${row("[Sample]", "[Sample result]")}
    </w:tbl>
    ${paragraph("Before you publish", "Heading1")}
    ${paragraph("Internal notes")}
    </w:body></w:document>`);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const { sections } = await newsletterWritingGuidance(bytes);
  assert.deepEqual(sections, [{ heading: "What changed" }, { heading: "What to check", columns: ["Check", "Result"] }]);

  await assert.rejects(() => renderNewsletterTemplate(bytes, "New issue", "Generic newsletter."), /What changed/);
  await assert.rejects(() => renderNewsletterTemplate(bytes, "New issue",
    "## What to check\nFirst.\n## What changed\nSecond."), /What to check/);
  await assert.rejects(() => renderNewsletterTemplate(bytes, "New issue",
    "## What changed\nDetails.\n## What to check\nThis section is missing its table."), /template table/);

  const result = await renderNewsletterTemplate(bytes, "New issue",
    "Subtitle: A practical guide\n\n## What changed\nDetails.\n## What to check\n| Check | Result |\n| --- | --- |\n| Local controls | Still work |");
  const xml = await (await JSZip.loadAsync(result)).file("word/document.xml")!.async("string");
  assert.match(xml, /New issue.*A practical guide.*What changed.*What to check/s);
  assert.match(xml, /<w:tbl>.*OriginalStyle.*<w:tc>.*Local controls.*Still work.*<\/w:tbl>/s);
  assert.doesNotMatch(xml, /Internal notes|Before you publish|\[Sample|Subtitle:/);
});
