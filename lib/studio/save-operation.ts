import type { Actor, Content } from "./types";
import type { ValidCommand } from "./commands";
type DraftSaveCommand = Extract<ValidCommand, { type: "content.save" }>;
export interface SaveOperation {
  id: string;
  actor: string;
  signature: string;
  baseRevision: number;
  savedRevision: number;
  at: string;
}
/** Fixed property order, including optional-field presence, binds a retry to one intent. */
export function draftSavePayload(c: DraftSaveCommand) {
  return JSON.stringify([
    c.id,
    c.expectedRevision,
    c.title,
    c.text,
    c.metadata,
    c.media,
    c.collection ?? null,
    c.format ?? null,
    c.account ?? null,
  ]);
}
export function savedOperation(c: Content, actor: Actor, operationId?: string) {
  return operationId
    ? c.saveOperations?.find(
        (op) => op.id === operationId && op.actor === actor.email,
      )
    : undefined;
}
