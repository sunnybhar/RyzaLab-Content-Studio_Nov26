import { z } from "zod";
import { rateSchema, type Rate } from "./pricing";
import { requirePermission, StudioError } from "./permissions";
import type { Actor, StudioState } from "./types";
export const rateChangeSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      expectedVersion: z.number().int().nonnegative(),
      card: rateSchema.omit({
        registryVersion: true,
        qualifiedBy: true,
        qualificationEvidence: true,
      }),
      evidence: z.string().trim().min(10).max(12000),
    })
    .strict(),
  z
    .object({
      action: z.literal("remove"),
      expectedVersion: z.number().int().nonnegative(),
      provider: z.enum(["anthropic", "openai", "google"]),
      model: z.string().min(1).max(150),
      function: z.string().min(1).max(50),
    })
    .strict(),
]);
export function updateRates(
  state: StudioState,
  actor: Actor,
  raw: unknown,
  current: Rate[],
  now: string,
  version: string,
) {
  requirePermission(state, actor, "settings.manage");
  const input = rateChangeSchema.parse(raw);
  if ((state.settings.pricingRegistryVersion || 0) !== input.expectedVersion)
    throw new StudioError(
      409,
      "Pricing changed. Reload the registry before saving.",
    );
  const selected = input.action === "save" ? input.card : input;
  if (input.action === "save") {
    if (!["text", "ideas", "review"].includes(input.card.function))
      throw new StudioError(
        400,
        "This editor currently qualifies text, ideas and review only. Research and media need separate adapter evaluation.",
      );
    const verified = Date.parse(input.card.verifiedAt);
    if (!Number.isFinite(verified) || verified > Date.parse(now))
      throw new StudioError(
        400,
        "Enter a valid verification date that is not in the future.",
      );
    const source = new URL(input.card.source);
    if (source.protocol !== "https:" || source.username || source.password)
      throw new StudioError(
        400,
        "Use an HTTPS pricing source without embedded credentials.",
      );
    if (
      input.card.inputCentsPerMillion === 0 &&
      input.card.outputCentsPerMillion === 0 &&
      !input.card.fixedCents
    )
      throw new StudioError(400, "Enter a nonzero conservative price.");
  }
  const same = (r: Rate) =>
    r.provider === selected.provider &&
    r.model === selected.model &&
    r.function === selected.function;
  const rates = current.filter((r) => !same(r));
  if (input.action === "remove" && rates.length === current.length)
    throw new StudioError(404, "Pricing entry not found.");
  if (input.action === "save")
    rates.push({
      ...input.card,
      registryVersion: version,
      qualifiedBy: actor.email,
      qualificationEvidence: input.evidence,
    });
  if (rates.length > 100)
    throw new StudioError(400, "The registry supports up to 100 entries.");
  const next = structuredClone(state);
  next.settings.qualifiedRates = rates;
  next.settings.pricingRegistryVersion = input.expectedVersion + 1;
  next.version++;
  next.audit.push({
    id: version,
    actor: actor.email,
    action: `pricing.${input.action}`,
    target: `${selected.provider}/${selected.model}/${selected.function}`,
    at: now,
  });
  return next;
}
