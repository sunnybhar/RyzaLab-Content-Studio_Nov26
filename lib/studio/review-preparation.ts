import type { StudioState } from "./types";
import { orchestrateCorrections } from "./correction-orchestration";
import { orchestrateReviews } from "./review-orchestration";
export function orchestrateReviewPreparation(
  state: StudioState,
  now = new Date().toISOString(),
) {
  return orchestrateReviews(orchestrateCorrections(state, now), now);
}
