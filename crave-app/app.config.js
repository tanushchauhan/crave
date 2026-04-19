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
const { expo } = require("./app.json");
module.exports = expo;
