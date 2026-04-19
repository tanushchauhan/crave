import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This app lives under a git root that is not an npm package. Next infers a
// "workspace root" above this folder; Turbopack then fails with "Next.js
// package not found" and HMR reload-loops. Pin the root to this directory.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
