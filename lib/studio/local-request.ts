const hosts = new Set(["localhost:3005", "127.0.0.1:3005"]);

export function allowedLocalRequest(request: Request) {
  const host = request.headers.get("host");
  const site = request.headers.get("sec-fetch-site");
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_STUDIO_LOCAL === "1" &&
    host !== null &&
    hosts.has(host) &&
    (!site || site === "same-origin" || site === "none") &&
    (["GET", "HEAD"].includes(request.method) || request.headers.get("origin") === `http://${host}`)
  );
}
