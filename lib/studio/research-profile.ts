import { excludedResearchUrl } from "./source-policy";
import { z } from "zod";
import type { Channel, StudioState } from "./types";
export const researchProfileSchema = z
  .object({
    preferredDomains: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/),
      )
      .max(12)
      .refine(
        (domains) =>
          domains.every((domain) => !excludedResearchUrl("https://" + domain)),
        "Wikipedia and mirrors cannot be preferred sources.",
      )
      .default([]),
    excludedDomains: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/),
      )
      .max(30)
      .default([]),
    sectors: z
      .array(
        z.enum([
          "construction",
          "real estate",
          "home automation",
          "IoT",
          "baby care",
          "elder care",
        ]),
      )
      .max(6)
      .default(["construction", "real estate", "home automation", "IoT"]),
    depth: z.enum(["focused", "deep", "extended"]).default("deep"),
  })
  .strict();
export type ResearchProfile = z.infer<typeof researchProfileSchema>;
export function researchProfile(state: StudioState, channel: Channel) {
  const file = state.agentRuleFiles?.find(
    (f) => f.channel === channel && f.slot === "source_preferences",
  );
  if (!file?.extractedText) return researchProfileSchema.parse({});
  try {
    return researchProfileSchema.parse(JSON.parse(file.extractedText));
  } catch {
    throw Error(
      "Source Preferences must contain valid JSON using the supplied template. Edit and save it in Agent Rules.",
    );
  }
}
export function researchQueries(query: string, profile: ResearchProfile) {
  const terms = profile.sectors.join(" OR ");
  const preferred = profile.preferredDomains.length
    ? " (" +
      profile.preferredDomains
        .slice(0, 3)
        .map((d) => `site:${d}`)
        .join(" OR ") +
      ")"
    : "";
  return {
    sector: `${query} ${preferred || ` (${terms}) technical evidence`}`,
    wider: `${query} independent reporting analysis limitations`,
  };
}
