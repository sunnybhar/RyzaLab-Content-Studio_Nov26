// Portable worker entrypoint; hosting and credentials are configured separately.
const origin = process.env.STUDIO_APP_URL,
  token = process.env.STUDIO_WORKER_TOKEN;
if (!origin || !token) {
  console.error("Set STUDIO_APP_URL and server-only STUDIO_WORKER_TOKEN.");
  process.exit(1);
}
const base = new URL(origin);
if (
  base.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(base.hostname)
) {
  console.error("Worker URL must use HTTPS.");
  process.exit(1);
}
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
while (!stopping) {
  for (const endpoint of ["maintenance", "notifications/dispatch", "worker"]) {
    if (stopping) break;
    try {
      const result = await fetch(new URL(`/api/studio/${endpoint}`, base), {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(175000),
      });
      console.log("Studio worker", endpoint, result.status);
      if (result.status === 401) {
        console.error("Worker credentials rejected.");
        stopping = true;
        break;
      }
    } catch {
      console.error(
        "Worker request interrupted. Unknown provider/delivery outcomes require reconciliation; no paid request is blindly retried.",
      );
    }
  }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, 30000));
}
