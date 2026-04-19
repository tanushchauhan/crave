/**
 * Backfill public.restaurants card fields + themed Unsplash photo_urls.
 *
 * Run from tools/supabase-seed: npm run backfill:card-fields
 * Flags: --dry-run
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (loads ../../.env when present)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { buildCardCopy, pickThemedPhotoUrls } from "./lib/restaurant-card-themes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [join(__dirname, ".env"), join(__dirname, "..", "..", ".env")];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    console.log("Loaded env from", p);
    break;
  }
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes("--dry-run");

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error: selErr } = await supabase
    .from("restaurants")
    .select("id, name");
  if (selErr) throw selErr;

  let updated = 0;
  for (const row of rows || []) {
    const photo_urls = pickThemedPhotoUrls(row.id, row.name);
    const { short_description, star_rating, review_count, distance_label } = buildCardCopy(
      row.id,
      row.name,
    );

    const patch = {
      photo_urls,
      star_rating,
      review_count,
      short_description,
      distance_label,
    };

    if (dryRun) {
      console.log("[dry-run]", row.name, patch);
      updated += 1;
      continue;
    }

    const { error: upErr } = await supabase.from("restaurants").update(patch).eq("id", row.id);
    if (upErr) {
      console.warn("update failed", row.id, row.name, upErr.message);
      continue;
    }
    updated += 1;
  }

  console.log(dryRun ? `Dry run: ${updated} row(s).` : `Updated ${updated} restaurant row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
