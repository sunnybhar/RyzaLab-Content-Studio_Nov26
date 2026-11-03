/** Log phases and timings only. Never log tokens, command bodies or documents. */
export function studioRequestDiagnostics(method: string) {
  const trace = crypto.randomUUID(),
    start = Date.now();
  let phase = "start";
  return {
    trace,
    stage(next: string) {
      phase = next;
      console.info("Studio request phase", {
        trace,
        method,
        phase,
        elapsedMs: Date.now() - start,
      });
    },
    failed(error: unknown) {
      console.error("Studio request failed", {
        trace,
        method,
        phase,
        elapsedMs: Date.now() - start,
        status:
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unknown",
      });
    },
  };
}
