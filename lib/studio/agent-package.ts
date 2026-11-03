import JSZip from "jszip";
/** Read documents only; never execute scripts, install skills or expand nested archives. */
export async function readAgentPackage(data: ArrayBuffer, kind: "channel" | "skill" = "channel") {
  if (data.byteLength > 1048576) throw Error("Choose a ZIP up to 1 MB.");
  const zip = await JSZip.loadAsync(data),
    entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > 64) throw Error("Package supports at most 64 files.");
  let total = 0;
  for (const entry of entries) {
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
  const instructions = entries.filter((f) =>
    (kind==="skill"?/(?:^|\/)SKILL\.md$/i:/(?:^|\/)INSTRUCTIONS\.md$/i).test(f.name),
  );
  if (instructions.length !== 1)
    throw Error(`Include exactly one ${kind === "skill" ? "SKILL.md" : "INSTRUCTIONS.md"} file.`);
  const docs = entries
    .filter((f) => (kind==="skill"?/\/references\/[^/]+\.md$/i:/\/knowledge\/[^/]+\.md$/i).test("/" + f.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!docs.length)
    throw Error("Include Markdown context files in a knowledge folder.");
  const instructionText = (await instructions[0].async("string")).trim();
  const context = (
    await Promise.all(
      docs.map(
        async (f) =>
          `\n\n# Source file: ${f.name}\n\n${await f.async("string")}`,
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
    ignored: entries
      .filter((f) => f !== instructions[0] && !docs.includes(f))
      .map((f) => f.name),
  };
}
