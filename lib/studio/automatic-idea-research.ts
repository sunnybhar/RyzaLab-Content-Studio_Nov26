import type { Actor, StudioState } from "./types";
import { commandSchema } from "./commands";
import { applyCommand } from "./engine";
import { requirePermission, StudioError } from "./permissions";
import { retrievePublicReferences } from "./public-retrieval";
import { ideaJobInput } from "./idea-generation";
import { quote } from "./pricing";
type Input = Extract<
  import("zod").infer<typeof commandSchema>,
  { type: "idea.generate" }
>;
/** Research and the paid idea job are committed atomically by the caller.
 * Same-key retries reuse the saved job, never repeat retrieval or generation. */
export async function automaticIdeaResearch(
  state: StudioState,
  actor: Actor,
  input: Input,
  retrieve = retrievePublicReferences,
  now = new Date().toISOString(),
) {
  for (const action of ["read", "idea.edit"])
    requirePermission(state, actor, action, { channel: input.channel });
  for (const fn of ["research", "ideas"] as const)
    requirePermission(state, actor, "job.create", {
      channel: input.channel,
      function: fn,
    });
  const previous = state.jobs.find(
    (j) =>
      j.createdBy === actor.email && j.idempotencyKey === input.idempotencyKey,
  );
  if (previous) {
    let old;
    try {
      old = JSON.parse(previous.prompt);
    } catch {}
    if (
      previous.kind !== "ideas" ||
      previous.contentId ||
      previous.channel !== input.channel ||
      previous.ideaPurpose !== input.purpose ||
      old?.topic !== input.topic ||
      old?.audience !== input.audience ||
      old?.quantity !== input.quantity ||
      old?.sourceText !== input.sourceText
    )
      throw new StudioError(
        409,
        "This request key belongs to a different idea request.",
      );
    return { state, command: input, existing: true };
  }
  // Validate model/pricing/authorization before disclosing the public topic.
  const preliminary = ideaJobInput(state, actor, {
    ...input,
    research: false,
    researchJobIds: [],
  });
  const priced = quote(state, preliminary);
  applyCommand(state, actor, preliminary, {
    quotedCost: priced.cost,
    pricingSnapshot: priced.pricingSnapshot,
    now,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input.idempotencyKey),
  );
  const researchKey =
    "idea-research:" +
    Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  const result = await retrieve(input.topic, undefined, now);
  const next = applyCommand(
    state,
    actor,
    {
      type: "research.retrieve",
      channel: input.channel,
      query: input.topic,
      idempotencyKey: researchKey,
    },
    { retrievalResult: result, now },
  );
  const command = commandSchema.parse({
    ...input,
    research: true,
    researchJobIds: [
      next.jobs.find(
        (job) =>
          job.createdBy === actor.email && job.idempotencyKey === researchKey,
      )!.id,
    ],
  }) as Input;
  return { state: next, command, existing: false };
}
