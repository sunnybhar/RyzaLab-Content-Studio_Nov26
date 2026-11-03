import JSZip from "jszip";
/** Read documents only; never execute scripts, install skills or expand nested archives. */
export async function readAgentPackage(
  data: ArrayBuffer,
  kind: "channel" | "skill" = "channel",
) {
  if (data.byteLength > 1048576) throw Error("Choose a ZIP up to 1 MB.");
  const zip = await JSZip.loadAsync(data),
    allEntries = Object.values(zip.files).filter((f) => !f.dir);
  if (allEntries.length > 64) throw Error("Package supports at most 64 files.");
  let total = 0;
  for (const entry of allEntries) {
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })
      ._data?.uncompressedSize;
    if (size === undefined || size > 262144)
      throw Error("Each expanded file must be at most 256 KB.");
    total += size;
    if (total > 1048576) throw Error("Expanded package exceeds 1 MB.");
    if (
      (
        (entry as unknown as { unsafeOriginalName?: string })
          .unsafeOriginalName || entry.name
      )
        .split("/")
        .some((p) => p === "..") ||
      entry.name.startsWith("/") ||
      entry.name.includes("\\")
    )
      throw Error("Unsafe archive path.");
  }
  const isMetadata = (name: string) =>
    name
      .split("/")
      .some(
        (part) =>
          part === "__MACOSX" || part === ".DS_Store" || part.startsWith("._"),
      );
  const entries = allEntries.filter((entry) => !isMetadata(entry.name));
  const metadataCount = allEntries.length - entries.length;
  const readText = async (entry: (typeof entries)[number]) => {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(
        await entry.async("uint8array"),
      );
    } catch {
      throw Error(
        `${entry.name} is not valid UTF-8 Markdown. Upload the original text file, not a metadata copy.`,
      );
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
      throw Error(
        `${entry.name} contains binary control characters. Upload the original Markdown file, not macOS metadata.`,
      );
    return text;
  };
  const instructions = entries.filter((f) =>
    (kind === "skill"
      ? /(?:^|\/)SKILL\.md$/i
      : /(?:^|\/)(?:INSTRUCTIONS|00-START-HERE-agent-instructions)\.md$/i
    ).test(f.name),
  );
  if (instructions.length !== 1)
    throw Error(
      `Include exactly one ${kind === "skill" ? "SKILL.md" : "INSTRUCTIONS.md"} file.`,
    );
  const docs = entries
    .filter((f) =>
      (kind === "skill"
        ? /\/references\/[^/]+\.md$/i
        : /\/knowledge\/[^/]+\.md$/i
      ).test("/" + f.name),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!docs.length)
    throw Error("Include Markdown context files in a knowledge folder.");
  const instructionText = (await readText(instructions[0])).trim();
  const context = (
    await Promise.all(
      docs.map(
        async (f) => `\n\n# Source file: ${f.name}\n\n${await readText(f)}`,
      ),
    )
  )
    .join("")
    .trim();
  if (
    !instructionText ||
    instructionText.length > 60000 ||
    !context ||
    context.length > 60000
  )
    throw Error(
      "Instructions and combined context must each contain 1–60,000 characters.",
    );
  return {
    instructions: instructionText,
    context,
    files: docs.map((f) => f.name),
    ignored: [
      ...entries
        .filter((f) => f !== instructions[0] && !docs.includes(f))
        .map((f) => f.name),
      ...(metadataCount ? [`macOS metadata (${metadataCount} files)`] : []),
    ],
  };
}
