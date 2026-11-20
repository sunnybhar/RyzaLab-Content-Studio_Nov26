import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import { newsletterWritingGuidance, renderNewsletterTemplate } from "../lib/studio/newsletter-template";

test("template export preserves existing copy and uses matching Word table styles", async () => {
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

  const custom = await renderNewsletterTemplate(bytes, "New issue",
    "## My opening\nMy wording stays exactly here.\n\n| Action | Outcome |\n| --- | --- |\n| Save | Keep existing copy |\n\n## Sources\n- https://example.org/source");
  const customXml = await (await JSZip.loadAsync(custom)).file("word/document.xml")!.async("string");
  assert.match(customXml, /My opening.*My wording stays exactly here.*<w:tbl>.*Action.*Outcome.*Keep existing copy.*Sources.*https:\/\/example.org\/source/s);
  assert.doesNotMatch(customXml, /What changed|What to check|Internal notes|\[Sample/);

  const result = await renderNewsletterTemplate(bytes, "New issue",
    "Subtitle: A practical guide\n\n## What changed\nDetails.\n## What to check\n| Check | Result |\n| --- | --- |\n| Local controls | Still work |");
  const xml = await (await JSZip.loadAsync(result)).file("word/document.xml")!.async("string");
  assert.match(xml, /New issue.*A practical guide.*What changed.*What to check/s);
  assert.match(xml, /<w:tbl>.*OriginalStyle.*<w:tc>.*Local controls.*Still work.*<\/w:tbl>/s);
  assert.doesNotMatch(xml, /Internal notes|Before you publish|\[Sample|Subtitle:/);
});

test("a saved Studio PNG is embedded alongside the template artwork", async () => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
    <w:p><w:r><w:drawing/></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>[Headline]</w:t></w:r></w:p>
  </w:body></w:document>`);
  zip.file("word/media/original-cover.png", "original cover fixture");
  const template = await zip.generateAsync({ type: "uint8array" });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const rendered = await renderNewsletterTemplate(template, "New issue", "The newsletter body.", new Date("2026-11-20"), {
    bytes: png, alt: "The <new> image", caption: "Issue photo.",
  });
  const output = await JSZip.loadAsync(rendered);
  assert.deepEqual(await output.file("word/media/studio-image-1.png")!.async("nodebuffer"), png);
  assert.equal(await output.file("word/media/original-cover.png")!.async("string"), "original cover fixture");
  assert.match(await output.file("word/_rels/document.xml.rels")!.async("string"), /Target="media\/studio-image-1.png"/);
  const document = await output.file("word/document.xml")!.async("string");
  assert.match(document, /New issue[\s\S]*descr="The &lt;new&gt; image"[\s\S]*Issue photo\.[\s\S]*The newsletter body\./);
  assert.match(document, /r:embed="rIdStudioImage1"/);
});
