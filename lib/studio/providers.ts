import { inspectClaudeResearchModel, discoverModels } from "./model-discovery";
import type { Connection, Job } from "./types";
import { researchConfigSchema, extractResearchResult, PUBLIC_RESEARCH_SYSTEM } from "./research";
import { validResearchReservation } from "./research-budget";
import { frozenSystem } from "./pricing";
import { StudioError } from "./permissions";
export class ProviderFailure extends Error {
  constructor(
    public ambiguous: boolean,
    message: string,
  ) {
    super(message);
  }
}
const TIMEOUT = 90000;
export async function validateConnection(connection: Connection, key: string) {
  if(connection.function === "research") {
    if(connection.provider!=="anthropic")throw new StudioError(400,"Research requires the Claude search adapter.");
    return inspectClaudeResearchModel(connection.model,key);
  }
  const ids = await discoverModels(connection.provider, key);
  if (!ids.includes(connection.model))
    throw new StudioError(
      400,
      "The configured model was not returned by the provider. Verify the exact API model ID.",
    );
  const supported =
    connection.provider === "anthropic"
      ? ["text", "ideas", "review", "research"]
      : connection.provider === "google"
        ? ["text", "ideas", "review"]
        : ["text", "ideas", "review", "image", "audio"];
  if (!supported.includes(connection.function))
    throw new StudioError(
      400,
      "This function requires an evaluated provider adapter. Model listing alone does not prove research, video, or editing capability.",
    );
}
export async function runProvider(
  job: Job,
  connection: Connection,
  key: string,
): Promise<{
  text?: string;
  bytes?: Uint8Array;
  mime?: string;
  completion?: "complete" | "incomplete" | "refused";
}> {
  if (
    !["text", "ideas", "review", "image", "audio", "research"].includes(
      job.kind,
    )
  )
    throw new ProviderFailure(
      false,
      "This research/video adapter is not yet qualified. No provider request was sent.",
    );
  // Public web research receives the explicit query, not private brand/reference
  // snapshots; reviewed results can later be attached to a writing workflow.
  const system =
    job.kind === "research"
      ? PUBLIC_RESEARCH_SYSTEM
      : frozenSystem(job);
  const maxTokens = (
    job as Job & { pricingSnapshot?: { maxOutputTokens?: number } }
  ).pricingSnapshot?.maxOutputTokens;
  if (!maxTokens)
    throw new ProviderFailure(
      false,
      "Qualified output limit is missing. No request sent.",
    );
  let url = "",
    headers: Record<string, string> = { "content-type": "application/json" },
    body: unknown;
  if (job.kind === "research") {
    const research = researchConfigSchema.safeParse(
      (job as Job & { pricingSnapshot?: unknown }).pricingSnapshot,
    );
    if (connection.provider !== "anthropic" || !research.success || !validResearchReservation(job.pricingSnapshot))
      throw new ProviderFailure(
        false,
        "Claude research is not qualified with bounded search costs. No provider request was sent.",
      );
    try {
      const capability=await inspectClaudeResearchModel(connection.model,key);
      const budget=(job.pricingSnapshot as {researchBudget:{contextTokens:number}}).researchBudget;
      if(capability.maxInputTokens!==budget.contextTokens || capability.maxOutputTokens<maxTokens)throw new Error("Model bounds changed");
    }catch {throw new ProviderFailure(false,"Research capability or token limits changed/unavailable. Recalculate research setup before dispatch; no paid request was sent.");}
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: connection.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: job.prompt }],
      tools: [
        {
          type: research.data.webSearchTool,
          name: "web_search",
          max_uses: research.data.maxSearchUses,
        },
      ],
    };
  } else if (job.kind === "image") {
    if (connection.provider !== "openai")
      throw new ProviderFailure(
        false,
        "Image adapter unavailable for this provider.",
      );
    url = "https://api.openai.com/v1/images/generations";
    headers.authorization = `Bearer ${key}`;
    body = {
      model: connection.model,
      prompt:
        system +
        "\nConcept image, no private details, no real installation claims. " +
        job.prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
    };
  } else if (job.kind === "audio") {
    if (connection.provider !== "openai")
      throw new ProviderFailure(
        false,
        "Audio adapter unavailable for this provider.",
      );
    url = "https://api.openai.com/v1/audio/speech";
    headers.authorization = `Bearer ${key}`;
    body = {
      model: connection.model,
      input: job.prompt,
      voice: "alloy",
      response_format: "mp3",
    };
  } else if (connection.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: connection.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: job.prompt }],
    };
  } else if (connection.provider === "openai") {
    url = "https://api.openai.com/v1/responses";
    headers.authorization = `Bearer ${key}`;
    body = {
      model: connection.model,
      instructions: system,
      input: job.prompt,
      max_output_tokens: maxTokens,
    };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(connection.model)}:generateContent`;
    headers["x-goog-api-key"] = key;
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: job.prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    };
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: "error",
    });
  } catch {
    throw new ProviderFailure(
      true,
      "Provider outcome is unknown after a transport interruption. Reservation is retained; do not retry blindly.",
    );
  }
  if (!response.ok) {
    const definite = [400, 401, 403, 404, 422, 429].includes(response.status);
    throw new ProviderFailure(
      !definite,
      `Provider returned HTTP ${response.status}. ${definite ? "The request was rejected." : "Outcome is uncertain; reservation is retained."}`,
    );
  }
  if (job.kind === "audio")
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      mime: "audio/mpeg",
    };
  let json;
  try {
    json = await response.json();
  } catch {
    throw new ProviderFailure(
      true,
      "A successful provider response could not be read. Reservation retained for reconciliation.",
    );
  }
  if (job.kind === "research") {
    const result = extractResearchResult(json);
    const text = JSON.stringify({...result,retrievedAt:new Date().toISOString()});
    if (text.length > 60000)
      throw new ProviderFailure(
        true,
        "Research result exceeded retained output limits; reconcile this completed request before retrying.",
      );
    return { text };
  }
  if (job.kind === "image") {
    if (!json.data?.[0]?.b64_json)
      throw new ProviderFailure(
        true,
        "Provider completed without a usable image payload. Check billing before retrying.",
      );
    return {
      bytes: new Uint8Array(Buffer.from(json.data[0].b64_json, "base64")),
      mime: "image/png",
    };
  }
  const text =
    connection.provider === "anthropic"
      ? json.content
          ?.filter((x: { type: string }) => x.type === "text")
          .map((x: { text: string }) => x.text)
          .join("\n")
      : connection.provider === "openai"
        ? json.output
            ?.flatMap(
              (x: { content?: { type: string; text?: string }[] }) =>
                x.content || [],
            )
            .filter((x: { type: string }) => x.type === "output_text")
            .map((x: { text: string }) => x.text)
            .join("\n")
        : json.candidates?.[0]?.content?.parts
            ?.map((x: { text?: string }) => x.text || "")
            .join("\n");
  if (!text)
    throw new ProviderFailure(
      true,
      "Provider response contained no usable written content. Reservation retained; check outcome.",
    );
  const truncated =
    json.stop_reason === "max_tokens" ||
    json.status === "incomplete" ||
    json.candidates?.[0]?.finishReason === "MAX_TOKENS";
  const refusal =
    json.stop_reason === "refusal" ||
    json.output?.some((item: { content?: { type: string }[] }) =>
      item.content?.some((c) => c.type === "refusal"),
    ) ||
    ["SAFETY", "PROHIBITED_CONTENT"].includes(
      json.candidates?.[0]?.finishReason,
    );
  const terminal =
    connection.provider === "anthropic"
      ? json.stop_reason === "end_turn"
      : connection.provider === "openai"
        ? json.status === "completed"
        : json.candidates?.[0]?.finishReason === "STOP";
  return {
    completion: refusal
      ? "refused"
      : truncated || ((job.outputContract || job.kind === "ideas") && !terminal)
        ? "incomplete"
        : "complete",
    text: truncated
      ? `[INCOMPLETE OUTPUT — token limit reached; not ready for approval]\n\n${text}`
      : text,
  };
}
