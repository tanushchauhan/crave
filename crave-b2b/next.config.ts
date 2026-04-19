import type { NextConfig } from "next";
import { config as loadDotenv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This app lives under a git root that is not an npm package. Next infers a
// "workspace root" above this folder; Turbopack then fails with "Next.js
// package not found" and HMR reload-loops. Pin the root to this directory.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(projectRoot, "..");

/** Same .env* precedence as Next (first listed file wins); load low → high so last wins. */
function loadRepoRootEnv(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const names =
    nodeEnv === "test"
      ? [".env.test.local", ".env.test", ".env"]
      : nodeEnv === "production"
        ? [".env.production.local", ".env.local", ".env.production", ".env"]
        : [".env.development.local", ".env.local", ".env.development", ".env"];
  for (const name of [...names].reverse()) {
    const full = path.join(repoRoot, name);
    if (!fs.existsSync(full)) continue;
    loadDotenv({ path: full, override: true });
  }
}

loadRepoRootEnv();

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  // Next 16: default `next dev` uses Turbopack; a `webpack` hook without this triggers a hard error.
  turbopack: {},
  // `next dev --webpack` / production builds: Watchpack / EINTR noise on macOS monorepos.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
