import type { Connection, Job } from "./types";
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
  const url =
    connection.provider === "anthropic"
      ? "https://api.anthropic.com/v1/models"
      : connection.provider === "openai"
        ? "https://api.openai.com/v1/models"
        : "https://generativelanguage.googleapis.com/v1beta/models";
  const headers: Record<string, string> =
    connection.provider === "anthropic"
      ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
      : connection.provider === "openai"
        ? { authorization: `Bearer ${key}` }
        : { "x-goog-api-key": key };
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    throw new StudioError(
      502,
      `Provider validation failed (HTTP ${response.status}). Check the credential and account access.`,
    );
  const json = await response.json();
  const ids = (json.data || json.models || []).map(
    (x: { id?: string; name?: string }) =>
      x.id || x.name?.replace(/^models\//, ""),
  );
  if (!ids.includes(connection.model))
    throw new StudioError(
      400,
      "The configured model was not returned by the provider. Verify the exact API model ID.",
    );
  const supported =
    connection.provider === "anthropic"
      ? ["text", "ideas", "review"]
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
): Promise<{ text?: string; bytes?: Uint8Array; mime?: string }> {
  if (!["text", "ideas", "review", "image", "audio"].includes(job.kind))
    throw new ProviderFailure(
      false,
      "This research/video adapter is not yet qualified. No provider request was sent.",
    );
  const system = frozenSystem(job);
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
  if (job.kind === "image") {
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
  return {
    text: truncated
      ? `[INCOMPLETE OUTPUT — token limit reached; not ready for approval]\n\n${text}`
      : text,
  };
}
