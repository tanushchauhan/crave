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

/** Same .env* precedence as Next (later files override). */
function envFileNames(): string[] {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "test") {
    return [".env.test.local", ".env.test", ".env"];
  }
  if (nodeEnv === "production") {
    return [".env.production.local", ".env.local", ".env.production", ".env"];
  }
  return [".env.development.local", ".env.local", ".env.development", ".env"];
}

/**
 * Load env from monorepo root then from crave-b2b so local overrides match Next defaults.
 * Root `.env` (see repo `.env.example`) uses `SUPABASE_URL` / `SUPABASE_ANON_KEY`; the app
 * expects `NEXT_PUBLIC_*` for the browser and middleware.
 */
function loadMonorepoEnv(): void {
  const names = envFileNames();
  for (const root of [repoRoot, projectRoot]) {
    for (const name of [...names].reverse()) {
      const full = path.join(root, name);
      if (!fs.existsSync(full)) continue;
      loadDotenv({ path: full, override: true });
    }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  }
}

loadMonorepoEnv();

const nextPublicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const nextPublicSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  // Ensure Turbopack / Edge middleware see the same vars as server (root .env uses SUPABASE_*).
  env: {
    NEXT_PUBLIC_SUPABASE_URL: nextPublicSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nextPublicSupabaseAnonKey,
  },
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
