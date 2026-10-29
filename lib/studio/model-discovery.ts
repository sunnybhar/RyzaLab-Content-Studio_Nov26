import type { Connection } from "./types";
import { StudioError } from "./permissions";

/** Account access only: listing does not qualify a model's capability or pricing. */
export async function discoverModels(
  provider: Connection["provider"],
  key: string,
  request = fetch,
) {
  const base =
    provider === "anthropic"
      ? "https://api.anthropic.com/v1/models"
      : provider === "openai"
        ? "https://api.openai.com/v1/models"
        : "https://generativelanguage.googleapis.com/v1beta/models";
  const headers: Record<string, string> =
    provider === "anthropic"
      ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
      : provider === "openai"
        ? { authorization: `Bearer ${key}` }
        : { "x-goog-api-key": key };
  const models = new Set<string>();
  const seen = new Set<string>();
  let cursor = "";
  try {
    for (let page = 0; page < 20; page++) {
      const url = new URL(base);
      if (provider === "anthropic") {
        url.searchParams.set("limit", "100");
        if (cursor) url.searchParams.set("after_id", cursor);
      }
      if (provider === "google") {
        url.searchParams.set("pageSize", "100");
        if (cursor) url.searchParams.set("pageToken", cursor);
      }
      const response = await request(url.toString(), {
        headers,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("provider response");
      const body = await response.json();
      const items = provider === "google" ? body.models : body.data;
      if (!Array.isArray(items)) throw new Error("invalid models");
      for (const item of items) {
        const model =
          provider === "google" ? item.name?.replace(/^models\//, "") : item.id;
        if (
          typeof model === "string" &&
          /^[A-Za-z0-9_.:/-]{1,150}$/.test(model)
        )
          models.add(model);
      }
      const next =
        provider === "google"
          ? body.nextPageToken
          : provider === "anthropic" && body.has_more
            ? body.last_id
            : undefined;
      if (!next) {
        if (provider === "anthropic" && body.has_more)
          throw new Error("missing cursor");
        return [...models].sort();
      }
      if (typeof next !== "string" || next.length > 4096 || seen.has(next))
        throw new Error("invalid cursor");
      seen.add(next);
      cursor = next;
    }
    throw new Error("page bound");
  } catch {
    throw new StudioError(
      502,
      "Could not list all account models. Check the provider credential and account access, then try again.",
    );
  }
}
