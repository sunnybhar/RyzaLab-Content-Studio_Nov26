export async function readStudioResponse<T>(response: Response): Promise<T> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    if ([408, 504].includes(response.status))
      throw Error(
        "The server timed out before the outcome was confirmed. Refresh the existing request status before trying again; no automatic retry was made.",
      );
    throw Error(
      `Studio returned an unreadable server response (HTTP ${response.status}). Refresh existing request status before resubmitting.`,
    );
  }
  if (!response.ok) {
    const error =
      value && typeof value === "object"
        ? (value as { error?: unknown; trace?: unknown })
        : {};
    const message =
      typeof error.error === "string"
        ? error.error
        : "Studio request failed. Refresh to check its current status.";
    throw Error(
      message +
        (typeof error.trace === "string" ? ` Reference: ${error.trace}` : ""),
    );
  }
  if (!value || typeof value !== "object")
    throw Error(
      "Studio returned an invalid response. Refresh existing request status before resubmitting.",
    );
  return value as T;
}
