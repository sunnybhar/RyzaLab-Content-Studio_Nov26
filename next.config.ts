import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
let commit =
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || "local";
if (commit === "local") {
  try {
    commit = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {}
}
const config: NextConfig = {
  env: {
    NEXT_PUBLIC_STUDIO_VERSION: "0.3.2",
    NEXT_PUBLIC_STUDIO_COMMIT: commit.slice(0, 7),
  },
  poweredByHeader: false,
  serverExternalPackages: [],
  outputFileTracingIncludes: {
    "/api/generate": ["./knowledge/**/*"],
    "/api/studio": ["./knowledge/channel-packages/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
