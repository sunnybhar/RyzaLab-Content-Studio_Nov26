import { z } from "zod";
import { ACTIVE_CHANNELS } from "./active-channels";
import { can, requirePermission, StudioError } from "./permissions";
import type { Actor, StudioState } from "./types";

export const pipelineRowSchema = z
  .object({
    externalId: z.string().trim().max(150),
    title: z.string().trim().min(1).max(200),
    angle: z.string().max(12000),
    channel: z.enum(ACTIVE_CHANNELS),
    account: z.string().trim().max(200),
    format: z.string().max(100),
    audience: z.string().max(500),
    plannedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    plannedTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    timezone: z.string().min(1).max(100),
    sourceUrls: z
      .array(
        z
          .url()
          .max(2000)
          .refine((url) => /^https?:\/\//i.test(url)),
      )
      .max(20),
    existingCopy: z.string().max(60000),
    notes: z.string().max(12000),
    historical: z.boolean(),
    sheet: z.string().min(1).max(200),
    row: z.number().int().min(1).max(100000),
  })
  .strict();
export type PipelineRow = z.infer<typeof pipelineRowSchema>;
export interface PipelineBrief extends PipelineRow {
  history?: { version: number; at: string; data: PipelineRow }[];
  id: string;
  identity: string;
  version: number;
  importedAt: string;
  importedBy: string;
  sourceFile: string;
  updatedAt: string;
  plannedAt?: string;
}
export interface PipelineImport {
  id: string;
  requestKey: string;
  signature: string;
  fileName: string;
  at: string;
  by: string;
  created: number;
  updated: number;
  skipped: number;
}
export const pipelineImportSchema = {
  fileName: z.string().trim().min(1).max(200),
  requestKey: z.string().min(1).max(150),
  rows: z
    .array(
      z
        .object({
          data: pipelineRowSchema,
          update: z.boolean(),
          expectedVersion: z.number().int().positive().optional(),
        })
        .strict(),
    )
    .min(1)
    .max(500),
};
/** Convert wall time only when the instant is unique. Reject DST gaps/folds. */
export function pipelineInstant(date: string, time: string, timezone: string) {
  const local = `${date}T${time}:00`;
  const wall = Date.parse(local + "Z");
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 19) !== local
  )
    throw new StudioError(400, "Invalid calendar date or time.");
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new StudioError(
      400,
      "Choose a valid IANA timezone, such as America/New_York.",
    );
  }
  const wallAt = (at: number) => {
    const p = formatter.formatToParts(new Date(at));
    const val = (key: string) => Number(p.find((x) => x.type === key)!.value);
    return Date.UTC(
      val("year"),
      val("month") - 1,
      val("day"),
      val("hour"),
      val("minute"),
      val("second"),
    );
  };
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const at = wall + hours * 3600000;
    offsets.add(wallAt(at) - at);
  }
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((at) => wallAt(at) === wall);
  if (matches.length !== 1)
    throw new StudioError(
      400,
      "This local time is missing or ambiguous across daylight saving. Choose another time.",
    );
  return new Date(matches[0]).toISOString();
}
export function validatePipelineRow(row: PipelineRow) {
  if (row.plannedTime && !row.plannedDate)
    throw new StudioError(400, "A time needs a date.");
  // Validate timezone even for unscheduled briefs and dates even without a time.
  try {
    new Intl.DateTimeFormat("en", { timeZone: row.timezone }).format();
  } catch {
    throw new StudioError(400, "Invalid timezone.");
  }
  if (row.plannedDate)
    pipelineInstant(row.plannedDate, row.plannedTime || "12:00", row.timezone);
  return row.plannedDate && row.plannedTime
    ? pipelineInstant(row.plannedDate, row.plannedTime, row.timezone)
    : undefined;
}
export function pipelineIdentity(file: string, row: PipelineRow) {
  return JSON.stringify(
    row.externalId
      ? ["id", row.externalId, row.channel]
      : ["row", file.toLowerCase(), row.sheet, row.row, row.channel],
  );
}
export function pipelineSnapshot(
  state: StudioState,
  actor: Actor,
  id?: string,
) {
  if (!id) return undefined;
  const brief = state.pipelineBriefs?.find((b) => b.id === id);
  if (!brief) throw new StudioError(404, "Pipeline brief not found.");
  requirePermission(state, actor, "read", {
    channel: brief.channel,
    account: brief.account,
  });
  const { history: _history, ...snapshot } = brief;
  return structuredClone(snapshot);
}
export function importPipeline(
  input: StudioState,
  actor: Actor,
  change: {
    fileName: string;
    requestKey: string;
    rows: { data: PipelineRow; update: boolean; expectedVersion?: number }[];
  },
  now: string,
  id: () => string,
) {
  const payload = JSON.stringify(change);
  let signature = 2166136261;
  for (let i = 0; i < payload.length; i++)
    signature = Math.imul(signature ^ payload.charCodeAt(i), 16777619);
  const digest = (signature >>> 0).toString(16);
  const replay = input.pipelineImports?.find(
    (i) => i.requestKey === change.requestKey && i.by === actor.email,
  );
  if (replay) {
    if (replay.signature !== digest)
      throw new StudioError(
        409,
        "This import key belongs to a different preview. Reopen import preview.",
      );
    return structuredClone(input);
  }
  const next = structuredClone(input);
  next.pipelineBriefs ??= [];
  next.pipelineImports ??= [];
  const seen = new Set<string>();
  let created = 0,
    updated = 0,
    skipped = 0;
  for (const entry of change.rows) {
    const row = pipelineRowSchema.parse(entry.data);
    requirePermission(input, actor, "idea.edit", {
      channel: row.channel,
      account: row.account,
    });
    requirePermission(input, actor, "schedule.manage", {
      channel: row.channel,
      account: row.account,
    });
    const plannedAt = validatePipelineRow(row),
      identity = pipelineIdentity(change.fileName, row);
    if (seen.has(identity))
      throw new StudioError(
        400,
        "Duplicate Brief ID/channel or source row in this import. Review the selected rows.",
      );
    seen.add(identity);
    const previous = next.pipelineBriefs.find((b) => b.identity === identity);
    if (previous && !entry.update) {
      skipped++;
      continue;
    }
    if (previous && previous.version !== entry.expectedVersion)
      throw new StudioError(
        409,
        "A pipeline brief changed since preview. Refresh and review the import again.",
      );
    if (
      previous &&
      next.contents.some(
        (c) => c.pipelineBriefId === previous.id && !c.deletedAt,
      )
    )
      throw new StudioError(
        409,
        "This brief already has linked content. Skip its update to preserve the original draft context.",
      );
    const brief: PipelineBrief = {
      history: previous
        ? [
            ...(previous.history || []),
            {
              version: previous.version,
              at: previous.updatedAt,
              data: pipelineRowSchema.parse(
                Object.fromEntries(
                  Object.keys(pipelineRowSchema.shape).map((key) => [
                    key,
                    previous[key as keyof PipelineRow],
                  ]),
                ),
              ),
            },
          ].slice(-5)
        : [],
      ...row,
      plannedAt,
      id: previous?.id || id(),
      identity,
      version: (previous?.version || 0) + 1,
      importedAt: previous?.importedAt || now,
      importedBy: previous?.importedBy || actor.email,
      sourceFile: change.fileName,
      updatedAt: now,
    };
    if (previous) {
      Object.assign(previous, brief);
      updated++;
    } else {
      next.pipelineBriefs.push(brief);
      created++;
    }
  }
  if (next.pipelineBriefs.length > 2000)
    throw new StudioError(
      400,
      "Pipeline limit is 2,000 briefs. Import a smaller calendar.",
    );
  next.pipelineImports.unshift({
    id: id(),
    requestKey: change.requestKey,
    signature: digest,
    fileName: change.fileName,
    at: now,
    by: actor.email,
    created,
    updated,
    skipped,
  });
  next.pipelineImports = next.pipelineImports.slice(0, 100);
  next.version++;
  next.audit.push({
    id: id(),
    actor: actor.email,
    action: "pipeline.import",
    target: change.requestKey,
    at: now,
  });
  return next;
}
export function visiblePipeline(state: StudioState, actor: Actor) {
  return (state.pipelineBriefs || []).filter((b) =>
    can(state, actor, "read", { channel: b.channel, account: b.account }),
  );
}
