export type NewsletterSection = { heading: string; columns?: string[] };

export function newsletterHeading(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").trim();
}

export function newsletterBlocks(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Array<
    { kind: "heading"; text: string } |
    { kind: "paragraph"; text: string } |
    { kind: "table"; columns: string[]; rows: string[][] }
  > = [];
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }
    const divider = lines[index + 1]?.trim();
    if (line.includes("|") && divider?.includes("|") &&
      cells(divider).length === cells(line).length && cells(divider).every((cell) => /^:?-{3,}:?$/.test(cell))) {
      const columns = cells(line);
      const rows: string[][] = [];
      index++;
      while (lines[index + 1]?.includes("|") && cells(lines[index + 1]).length === columns.length &&
        !/^\s*#/.test(lines[index + 1])) {
        rows.push(cells(lines[++index]));
      }
      blocks.push({ kind: "table", columns, rows });
      continue;
    }
    blocks.push({ kind: "paragraph", text: line });
  }
  return blocks;
}

export function newsletterStructureIssue(outline: NewsletterSection[], text: string) {
  if (!outline.length) return undefined;
  const blocks = newsletterBlocks(text);
  let start = 0;
  for (const section of outline) {
    const at = blocks.findIndex((block, index) => index >= start && block.kind === "heading" &&
      newsletterHeading(block.text) === newsletterHeading(section.heading));
    if (at < 0) return `Add “${section.heading}” in the template’s section order.`;
    start = at + 1;
    const nextSection = blocks.findIndex((block, index) => index > at && block.kind === "heading" &&
      outline.some(({ heading }) => newsletterHeading(block.text) === newsletterHeading(heading)));
    const contents = blocks.slice(start, nextSection < 0 ? undefined : nextSection);
    if (section.columns && !contents.some((block) => block.kind === "table" && block.rows.length &&
      block.columns.length === section.columns!.length &&
      block.columns.every((column, index) => newsletterHeading(column) === newsletterHeading(section.columns![index])))) {
      return `Add the template table under “${section.heading}”.`;
    }
    if (!contents.some((block) => block.kind === "paragraph" || (block.kind === "table" && block.rows.length)))
      return `Add content under “${section.heading}”.`;
  }
  return undefined;
}
