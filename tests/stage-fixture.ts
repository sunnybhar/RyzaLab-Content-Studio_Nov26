import { applyCommand, type ExecutionContext } from "../lib/studio/engine";
import {
  STAGE_DEFINITIONS,
  currentWorkflow,
  hasVisuals,
} from "../lib/studio/stages";
import type { Actor, StudioState } from "../lib/studio/types";
// Existing approval tests explicitly complete human checks; production never auto-passes them.
export function completeChecks(
  state: StudioState,
  actor: Actor,
  contentId: string,
  ctx: ExecutionContext = {},
) {
  let next = state;
  for (const { key } of STAGE_DEFINITIONS.slice(0, 6)) {
    const d = next.contents.find((c) => c.id === contentId)!;
    next = applyCommand(
      next,
      actor,
      {
        type: "stage.decide",
        contentId,
        stage: key,
        status: key === "visual_review" && !hasVisuals(d) ? "na" : "pass",
        reason: "Human test reviewer inspected this exact version.",
        evidence:
          "Human test attestation: sources and current package inspected; not an automated independent review.",
        expectedRevision: d.revision,
        expectedWorkflowId: currentWorkflow(d, next)?.id,
        expectedRuleVersion: next.settings.protectedVersion,
      },
      ctx,
    );
  }
  return next;
}
