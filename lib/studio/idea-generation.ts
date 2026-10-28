import { z } from "zod";
import { StudioError, filteredState } from "./permissions";
import type { Actor, Channel, Idea, StudioState } from "./types";
export const generatedIdeasSchema = z
  .object({
    ideas: z
      .array(
        z
          .object({
            title: z.string().min(3).max(200),
            brief: z.string().min(5).max(4000),
            audience: z.string().max(500),
            format: z.string().max(150),
            sources: z.array(z.url()).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export function parseGeneratedIdeas(text: string) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  try {
    return generatedIdeasSchema.parse(JSON.parse(clean)).ideas;
  } catch {
    throw new Error(
      "The provider result is not a complete idea-card set. Preserve the result and revise it; no partial or invented idea cards were imported.",
    );
  }
}
export function sampleIdeas(
  channel: Channel,
  topic: string,
  quantity: number,
  audience: string,
) {
  const angles = [
    "Questions worth asking",
    "A practical checklist",
    "What to verify before choosing",
    "The limits worth explaining",
    "A useful comparison",
    "What a handoff should include",
    "A source-led explainer",
    "One routine to investigate",
  ];
  return Array.from({ length: quantity }, (_, i) => ({
    title: `${angles[i % angles.length]}: ${topic.slice(0, 110)}${i >= angles.length ? " " + (i + 1) : ""}`,
    brief: `PREVIEW SAMPLE — explore ${topic} for ${audience || "the selected audience"}. Confirm the relevant facts and source material before drafting. This is a local example, not agent output.`,
    audience: audience || "General audience",
    format:
      channel === "YouTube"
        ? "Video outline"
        : channel === "Instagram" || channel === "TikTok"
          ? "Short video or carousel"
          : "Post or article",
    sources: [],
  }));
}
export function ideaJobInput(
  state: StudioState,
  actor: Actor,
  c: {
    channel: Channel;
    topic: string;
    audience: string;
    quantity: number;
    research: boolean;
    sourceText: string;
    idempotencyKey: string;
  },
) {
  const visible = filteredState(state, actor);
  const workflow = visible.workflows.find(
    (w) => w.channel === c.channel && w.status === "active",
  );
  const connectionId =
    workflow?.functionConnections?.ideas ||
    state.connections.find((conn) => conn.function === "ideas")?.id;
  if (!connectionId)
    throw new StudioError(
      400,
      "Configure and activate an Ideas function connection in Workflow Settings first.",
    );
  return {
    type: "job.enqueue",
    kind: "ideas",
    channel: c.channel,
    connectionId,
    estimate: 0,
    idempotencyKey: c.idempotencyKey,
    prompt: JSON.stringify({
      task: 'Generate idea cards, not finished posts. Return ONLY JSON {"ideas":[{"title":"...","brief":"specific angle, proof needed, why useful","audience":"...","format":"...","sources":[]}]}. Do not invent source access. This request uses provided reference context, not current web research.',
      quantity: c.quantity,
      topic: c.topic,
      audience: c.audience,
      sourceText: c.sourceText,
      previousIdeas: visible.ideas
        .filter((i) => i.channel === c.channel)
        .slice(0, 30)
        .map((i) => ({ title: i.title, state: i.state })),
      priorContent: visible.contents
        .filter((d) => d.channel === c.channel)
        .slice(0, 15)
        .map((d) => d.title),
    }),
  };
}
