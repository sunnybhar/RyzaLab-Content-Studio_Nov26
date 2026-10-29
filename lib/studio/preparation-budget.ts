import type { Job, StudioState, Content } from "./types";
import { budgetMonth } from "./time";
import { soloPolicy } from "./solo-quality";
export function preparationFor(
  s: StudioState,
  c: Content | undefined,
  actorEmail: string,
  now: string,
) {
  const policy = soloPolicy(s);
  if (!c || !policy) return undefined;
  return s.preparations?.find(
    (p) =>
      p.id === c.preparationId &&
      p.contentId === c.id &&
      p.channel === c.channel &&
      p.account === c.account &&
      p.authorizedFor === actorEmail &&
      p.authorizedFor === c.assignedTo &&
      p.policyVersion === policy.version &&
      p.period === budgetMonth(now, s.settings.timezone),
  );
}
export function preparationSpend(
  s: StudioState,
  preparationId: string,
  excludeJob?: string,
) {
  const preparation = s.preparations?.find((p) => p.id === preparationId);
  const ids = new Set(
    s.preparations
      ?.filter((p) => p.contentId === preparation?.contentId)
      .map((p) => p.id),
  );
  return s.jobs
    .filter(
      (j) => j.preparationId && ids.has(j.preparationId) && j.id !== excludeJob,
    )
    .reduce((sum, j) => sum + (j.actual ?? j.reserved), 0);
}
export function jobPreparation(s: StudioState, j: Job, now: string) {
  const c = s.contents.find((c) => c.id === j.contentId);
  const p = preparationFor(s, c, j.createdBy, now);
  return p && p.id === j.preparationId && p.functions.includes(j.kind)
    ? p
    : undefined;
}
