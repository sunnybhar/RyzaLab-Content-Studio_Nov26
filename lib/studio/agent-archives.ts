import { z } from "zod";
import { storedAgentFileSchema } from "./agent-rule-files";
import type { StudioState, Channel } from "./types";
import { StudioError } from "./permissions";
export const agentArchiveSchema = storedAgentFileSchema.extend({
  fileName: z
    .string()
    .min(1)
    .max(200)
    .regex(/\.zip$/i)
    .refine((v) => !/[\\/\x00-\x1f]/.test(v)),
  base64: storedAgentFileSchema.shape.base64.max(1398104),
  byteSize: z.number().int().min(1).max(1048576),
  kind: z.enum(["channel", "skill"]),
});
export type AgentArchiveInput = z.infer<typeof agentArchiveSchema>;
export interface AgentArchive extends AgentArchiveInput {
  id: string;
  channel: Channel;
  uploadedBy: string;
  uploadedAt: string;
}
export function saveAgentArchives(
  state: StudioState,
  channel: Channel,
  archives: AgentArchiveInput[],
  actor: string,
  now: string,
  id: () => string,
) {
  if (new Set(archives.map((a) => a.kind)).size !== archives.length)
    throw new StudioError(400, "Choose one original archive per package kind.");
  for (const archive of archives) {
    const bytes = atob(archive.base64).length;
    if (bytes !== archive.byteSize)
      throw new StudioError(
        400,
        "Original ZIP byte size does not match its upload.",
      );
  }
  const previous = (state.agentPackageArchives || []).filter(
    (a) =>
      a.channel !== channel ||
      (!archives.some((x) => x.kind === "channel") &&
        !archives.some((x) => x.kind === a.kind)),
  );
  const next = [
    ...previous,
    ...archives.map((a) => ({
      ...a,
      id: id(),
      channel,
      uploadedBy: actor,
      uploadedAt: now,
    })),
  ];
  if (next.reduce((sum, a) => sum + a.byteSize, 0) > 2097152)
    throw new StudioError(
      400,
      "Original ZIP storage exceeds 2 MB. Use smaller archives.",
    );
  state.agentPackageArchives = next;
}
