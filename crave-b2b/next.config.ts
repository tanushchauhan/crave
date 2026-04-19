import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This app lives under a git root that is not an npm package. Next infers a
// "workspace root" above this folder; Turbopack then fails with "Next.js
// package not found" and HMR reload-loops. Pin the root to this directory.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

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
