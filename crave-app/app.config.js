const fs = require("node:fs");
const path = require("node:path");
const { config: loadDotenv } = require("dotenv");

const appRoot = __dirname;
const repoRoot = path.resolve(appRoot, "..");
const nodeEnv = process.env.NODE_ENV || "development";
const envNames =
  nodeEnv === "test"
    ? [".env.test.local", ".env.test", ".env"]
    : nodeEnv === "production"
      ? [".env.production.local", ".env.local", ".env.production", ".env"]
      : [".env.development.local", ".env.local", ".env.development", ".env"];
for (const name of [...envNames].reverse()) {
  const full = path.join(repoRoot, name);
  if (!fs.existsSync(full)) continue;
  loadDotenv({ path: full, override: true });
}

// When app.config.js exists, Expo uses it; keep canonical fields in app.json.
// Expose Supabase URL/anon from root .env: Metro only inlines EXPO_PUBLIC_*; many monorepos
// only set SUPABASE_URL + SUPABASE_ANON_KEY, so we pass them through `extra` for lib/supabase.ts.
const { expo } = require("./app.json");

const LOCATION_WHEN_IN_USE =
    "Crave uses your location to show restaurants near you on the recommendations tab.";

module.exports = {
    ...expo,
    ios: {
        ...(expo.ios ?? {}),
        infoPlist: {
            ...(expo.ios?.infoPlist ?? {}),
            NSLocationWhenInUseUsageDescription:
                expo.ios?.infoPlist?.NSLocationWhenInUseUsageDescription ??
                LOCATION_WHEN_IN_USE,
        },
    },
    extra: {
        ...(expo.extra ?? {}),
        supabaseUrl:
            process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
        supabaseAnonKey:
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            "",
    },
};
