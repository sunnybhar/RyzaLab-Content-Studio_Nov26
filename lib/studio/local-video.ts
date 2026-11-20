import { ProviderFailure } from "./providers";

const base = "https://generativelanguage.googleapis.com";
const operationPath = /^models\/veo-3\.1-(?:fast-)?generate-preview\/operations\/[A-Za-z0-9_-]+$/;
export class LocalVideoFailed extends Error {}
export const localVideoModel = /^veo-3\.1-(?:fast-)?generate-preview$/;

async function videoRequest(path: string, key: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`${base}/v1beta/${path}`, {
      method: body ? "POST" : "GET",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new ProviderFailure(true, "Veo could not be reached. Check the existing request before trying again.");
  }
  if (!response.ok)
    throw new ProviderFailure(
      ![400, 401, 403, 404, 422, 429].includes(response.status),
      `Veo returned HTTP ${response.status}.`,
    );
  return response;
}

export async function startLocalVideo(model: string, prompt: string, key: string) {
  if (!localVideoModel.test(model))
    throw new ProviderFailure(false, "Choose a supported Gemini Veo 3.1 model.");
  const response = await videoRequest(`models/${model}:predictLongRunning`, key, {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, durationSeconds: 8, aspectRatio: "16:9", resolution: "720p" },
  });
  const result = await response.json();
  if (typeof result.name !== "string" || !operationPath.test(result.name) ||
      !result.name.startsWith(`models/${model}/`))
    throw new ProviderFailure(true, "Veo returned no usable operation ID. The reservation is retained.");
  return result.name as string;
}

export async function checkLocalVideo(operation: string, key: string) {
  if (!operationPath.test(operation))
    throw new ProviderFailure(false, "The saved Veo operation ID is invalid.");
  const result = await (await videoRequest(operation, key)).json();
  if (!result.done) return undefined;
  if (result.error) throw new LocalVideoFailed("Veo reported an unsuccessful video. Check provider billing before retrying.");
  const uri = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  const url = new URL(uri);
  if (url.origin !== base || url.username || url.password ||
      !/^\/v1beta\/files\/[A-Za-z0-9_-]+:download$/.test(url.pathname))
    throw new ProviderFailure(true, "Veo returned an unsupported video download URL.");
  const response = await videoRequest(url.pathname.slice("/v1beta/".length) + url.search, key);
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderFailure(true, "Veo returned no video bytes.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 50 * 1024 * 1024) {
        await reader.cancel();
        throw new ProviderFailure(true, "The returned video exceeds the 50 MB local limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const video = Buffer.concat(chunks);
  if (video.length < 12 || video.subarray(4, 8).toString("ascii") !== "ftyp")
    throw new ProviderFailure(true, "The returned video is not a valid MP4.");
  return video;
}
