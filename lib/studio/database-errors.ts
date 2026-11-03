import { StudioError } from "./permissions";
/** Never infer a missing migration from a timeout, network error or permissions. */
export function studioDatabaseError(
  error: unknown,
  operation: "read" | "save" | "initialize" | "membership",
) {
  const value =
    error && typeof error === "object"
      ? (error as { code?: string; message?: string })
      : {};
  const code =
    typeof value.code === "string" && /^[A-Z0-9_]{1,20}$/i.test(value.code)
      ? value.code
      : "unknown";
  console.error("Studio database operation failed", { operation, code });
  if (
    ["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(
      code,
    )
  )
    return new StudioError(
      503,
      "The Studio database schema is missing or outdated. Apply supabase/migrations/20261027_studio_v2.sql after checking the deployment database configuration.",
    );
  if (code === "42501")
    return new StudioError(
      503,
      "Studio database access was denied. Check the server service-role credentials and database permissions; this is not evidence that a migration is missing.",
    );
  if (
    code === "57014" ||
    /timeout|timed out|statement.?timeout/i.test(value.message || "")
  )
    return new StudioError(
      503,
      `The Studio database ${operation === "read" ? "read" : operation} timed out. Refresh the existing request status before resubmitting. A timeout does not mean the migration is missing.`,
    );
  return new StudioError(
    503,
    `The Studio database ${operation === "save" ? "save outcome could not be confirmed" : "is temporarily unavailable"}. Refresh to check existing work before resubmitting. Server diagnostic code: ${code}.`,
  );
}
