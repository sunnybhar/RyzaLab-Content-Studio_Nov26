import type { Actor, Content, StudioState } from "./types";
import type { ValidCommand } from "./commands";
import { applyCommand, type ExecutionContext } from "./engine";
import { StudioError } from "./permissions";
export type DraftSaveCommand = Extract<ValidCommand, { type: "content.save" }>;
import { savedOperation } from "./save-operation";
/** Only this pure save is eligible for one CAS retry. Never retries an ambiguous commit or an AI call. */
export async function commitDraftSave(
  original: StudioState,
  actor: Actor,
  command: DraftSaveCommand,
  io: {
    load: () => Promise<StudioState>;
    commit: (before: StudioState, after: StudioState) => Promise<void>;
  },
  ctx: ExecutionContext = {},
) {
  let before = original;
  for (let attempt = 0; attempt < 2; attempt++) {
    const next = applyCommand(before, actor, command, ctx);
    try {
      await io.commit(before, next);
      return next;
    } catch (error) {
      if (error instanceof StudioError && ![409, 503, 504].includes(error.code))
        throw error;
      let fresh: StudioState;
      try {
        fresh = await io.load();
      } catch {
        throw error;
      }
      const receipt = fresh.contents.find((c) => c.id === command.id);
      if (receipt && savedOperation(receipt, actor, command.operationId))
        return applyCommand(fresh, actor, command, ctx);
      if (
        attempt === 0 &&
        error instanceof StudioError &&
        error.code === 409 &&
        fresh.contents.find((c) => c.id === command.id)?.revision ===
          command.expectedRevision
      ) {
        before = fresh;
        continue;
      }
      throw error;
    }
  }
  throw new StudioError(
    409,
    "The draft save could not be reconciled. Your edits are retained; check save status.",
  );
}
