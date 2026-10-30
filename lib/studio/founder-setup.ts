import { z } from "zod";
import type { Actor, StudioState } from "./types";
import { memberFor, StudioError } from "./permissions";
export const founderClaimSchema = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    acknowledge: z.literal(true),
  })
  .strict();
export function founderSetupStatus(
  state: StudioState,
  actor: Actor,
  configuredEmail?: string,
) {
  const member = memberFor(state, actor);
  const exists =
    state.members.some((m) => m.roles.includes("founder")) ||
    Boolean(state.settings.founderSetup);
  const configured = z.email().safeParse(configuredEmail?.trim().toLowerCase());
  return {
    eligible:
      !exists &&
      member.roles.includes("administrator") &&
      configured.success &&
      configured.data === actor.email.toLowerCase(),
    founderExists: exists,
    configured: configured.success,
  };
}
/** Only the verified signed-in, server-designated existing administrator can claim once. */
export function claimFounder(
  state: StudioState,
  actor: Actor,
  raw: unknown,
  configuredEmail: string | undefined,
  now: string,
  id: string,
) {
  const input = founderClaimSchema.parse(raw);
  if (
    state.settings.founderSetup?.actorId === actor.id &&
    state.members.some(
      (m) =>
        !m.revoked && m.email === actor.email && m.roles.includes("founder"),
    )
  )
    return state;
  if (!founderSetupStatus(state, actor, configuredEmail).eligible)
    throw new StudioError(
      403,
      "First-founder setup is unavailable for this account. An existing founder or deployment owner must resolve access.",
    );
  if (state.version !== input.expectedVersion)
    throw new StudioError(
      409,
      "Workspace changed. Refresh before confirming founder setup.",
    );
  const next = structuredClone(state);
  next.members
    .find((m) => m.email === actor.email && !m.revoked)!
    .roles.push("founder");
  next.settings.founderSetup = {
    actorId: actor.id,
    email: actor.email,
    at: now,
  };
  next.version++;
  next.audit.push({
    id,
    actor: actor.email,
    action: "founder.initial_claim",
    target: actor.id,
    at: now,
  });
  return next;
}
