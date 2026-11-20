import { excludedResearchUrl } from "./source-policy";
import {researchProfile} from "./research-profile";
import {ideaResearchQuery,screenIdeaResearch} from "./idea-research-query";
import type { Actor, StudioState } from "./types";
import { commandSchema } from "./commands";
import { applyCommand } from "./engine";
import { requirePermission, StudioError } from "./permissions";
import { retrieveBroadReferences } from "./web-discovery";
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
  retrieve = retrieveBroadReferences,
  now = new Date().toISOString(),
  saveResearch?: (next:StudioState)=>Promise<void>,
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
      old?.pipeline?.id !== input.pipelineBriefId ||
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
  const query=ideaResearchQuery(input.topic,input.audience);
  const saved=state.jobs.find(job=>job.idempotencyKey===researchKey&&job.createdBy===actor.email);
  const profile = researchProfile(state, input.channel);
  const sourceUrls = [...new Set((input.sourceText || "").split(/\r?\n/).map((line) => line.trim())
    .filter((line) => /^https:\/\/\S+$/.test(line))
    .filter((line) => !excludedResearchUrl(line) && !profile.excludedDomains.some((domain) => {
      const host = new URL(line).hostname.toLowerCase();
      return host === domain || host.endsWith(`.${domain}`);
    })))].slice(0, 10);
  const result = screenIdeaResearch(
    saved?.result ? JSON.parse(saved.result) : await retrieve(query, undefined, now, profile, sourceUrls),
    input.topic, input.audience,
  );
  const next = applyCommand(
    state,
    actor,
    {
      type: "research.retrieve",
      channel: input.channel,
      query,
      ...(sourceUrls.length ? { sourceUrls } : {}),
      idempotencyKey: researchKey,
    },
    { retrievalResult: result, now },
  );
  if(saveResearch && next!==state)await saveResearch(next);
  const command = commandSchema.parse({
    ...input,
    research: true,
    researchJobIds: [
      next.jobs.find(
        (job) =>
          job.createdBy === actor.email && job.idempotencyKey === researchKey,
      )!.id,
      ...(input.researchJobIds || []),
    ].filter((id, index, all) => all.indexOf(id) === index).slice(0, 5),
  }) as Input;
  return { state: next, command, existing: false };
}
