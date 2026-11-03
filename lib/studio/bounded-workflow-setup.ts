import type { Actor, StudioState } from "./types";
import { requirePermission, StudioError } from "./permissions";
import { effectiveRates } from "./pricing";
import { updateRates } from "./rate-management";
import { RESEARCH_PRICE } from "./research-budget";

/** Explicit setup reuses the stored writing credential for tool-free roles only. */
export function saveBoundedWorkflowSetup(
  state: StudioState,
  actor: Actor,
  input: {
    connectionId: string;
    expectedVersion: number;
    applyChannels?: boolean;
    channels?: ("LinkedIn" | "Newsletter")[];
  },
  capability: {
    documentedBounds?: true;
    model: string;
    maxInputTokens: number;
    maxOutputTokens: number;
  },
  now: string,
) {
  requirePermission(state, actor, "settings.manage");
  for (const fn of ["text", "ideas", "review"] as const)
    requirePermission(state, actor, "connections.manage", { function: fn });
  if (input.expectedVersion !== state.version)
    throw new StudioError(409, "Workspace changed. Refresh setup.");
  const connection = state.connections.find((c) => c.id === input.connectionId);
  if (
    !connection ||
    connection.provider !== "anthropic" ||
    connection.function !== "text" ||
    connection.model !== RESEARCH_PRICE.model ||
    connection.status === "disconnected" ||
    !connection.hasKey ||
    capability.model !== connection.model
  )
    throw new StudioError(
      409,
      "Select a stored Claude Sonnet 5.5 writing connection.",
    );
  if (capability.maxInputTokens < 65536 || capability.maxOutputTokens < 4096)
    throw new StudioError(
      409,
      "Model token bounds do not support this bounded setup.",
    );
  if (
    state.jobs.some(
      (j) =>
        j.connectionId === connection.id &&
        ["queued", "running", "unknown", "awaiting_confirmation"].includes(
          j.state,
        ),
    )
  )
    throw new StudioError(
      409,
      "Resolve active or uncertain requests on this connection before changing setup.",
    );
  let next = state;
  for (const fn of ["text", "ideas", "review"] as const)
    next = updateRates(
      next,
      actor,
      {
        action: "save",
        expectedVersion: next.settings.pricingRegistryVersion || 0,
        evidence: `User-supplied Claude documentation dated ${RESEARCH_PRICE.verifiedAt}; ${capability.documentedBounds ? "Models API identity checked; input/output capacity from the supplied dated Sonnet 5.5 documentation" : "Models API bounds checked"} ${now}. Tool-free text adapter; no live generation test inferred.`,
        card: {
          provider: "anthropic",
          model: connection.model,
          function: fn,
          currency: "USD",
          inputCentsPerMillion: RESEARCH_PRICE.inputCentsPerMillion,
          outputCentsPerMillion: RESEARCH_PRICE.outputCentsPerMillion,
          maxInputBytes: 65536,
          maxOutputTokens: fn === "text" ? 4096 : 2048,
          source: RESEARCH_PRICE.tokenSource,
          verifiedAt: RESEARCH_PRICE.verifiedAt,
          qualified: true,
        },
      },
      effectiveRates(next),
      now,
      crypto.randomUUID(),
    );
  const target = next.connections.find((c) => c.id === connection.id)!;
  // A tool-free call requires its own existing or conservative capped allowance.
  (target as typeof target & { maxRequestCost?: number }).maxRequestCost =
    Math.max(
      (target as typeof target & { maxRequestCost?: number }).maxRequestCost ||
        0,
      18,
    );
  next.boundedChannelSelection={connectionId:connection.id,value:input.applyChannels ?? Boolean(input.channels?.length)};
  target.supportedFunctions = ["text", "ideas", "review"];
  target.status = "validated";
  target.updatedAt = now;
  // Keep existing request, package and monthly allowances and all explicit channel mappings.
  next.settings.defaultConnections = {
    ...next.settings.defaultConnections,
    text: connection.id,
    ideas: connection.id,
    review: connection.id,
  };
  for (const channel of input.channels || []) {
    requirePermission(state, actor, "workflow.edit", { channel });
    const workflow = next.workflows.find(
      (w) => w.channel === channel && w.status === "active",
    );
    if (!workflow)
      throw new StudioError(
        409,
        `Activate the ${channel} workflow before selecting it here.`,
      );
    workflow.functionConnections = {
      ...workflow.functionConnections,
      text: connection.id,
      ideas: connection.id,
      review: connection.id,
    };
    workflow.connectionId = connection.id;
  }
  next.audit.push({
    id: crypto.randomUUID(),
    actor: actor.email,
    action: "workflow.boundedSetup",
    target: connection.id,
    at: now,
  });
  return next;
}
