/**
 * Backfill nullable/empty columns on public.restaurants without touching
 * image_embedding, yelp_id, or owner_user_id.
 *
 * Run: npm run fill-blanks  (from tools/supabase-seed)
 * Flags: --dry-run, --no-embeddings
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional (embeddings): AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   BEDROCK_EMBEDDING_TEXT_MODEL_ID (default amazon.titan-embed-text-v1)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import {
  defaultDemoHours,
  defaultDemoPointWkt,
  defaultPriceTier,
  inferCuisineTagsFromName,
  isBlankCuisineTags,
  isBlankHours,
  isBlankPhotoUrls,
  pickDemoPhotos,
  syntheticPhoneE164,
} from "./lib/restaurant-dummies.mjs";

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

function vecToPgLiteral(vec) {
  if (!vec?.length) return null;
  return `[${vec.join(",")}]`;
}

async function embedOne(client, modelId, text) {
  const out = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text.slice(0, 8000) }),
    }),
  );
  const json = JSON.parse(new TextDecoder().decode(out.body));
  const emb = json.embedding;
  if (!Array.isArray(emb) || emb.length !== 1536) {
    throw new Error(`bad_embedding_dim:${emb?.length}`);
  }
  return emb;
}

function embeddingTextForRow(row, cuisineTags) {
  const tags = cuisineTags?.length ? cuisineTags : inferCuisineTagsFromName(row.name);
  return `${row.name}. Cuisine: ${tags.join(", ")}. Near UT Austin, Texas.`;
}

async function main() {
  loadEnv();
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const noEmbeddings = args.has("--no-embeddings");

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const embedModel =
    (process.env.BEDROCK_EMBEDDING_TEXT_MODEL_ID || "").trim() || "amazon.titan-embed-text-v1";

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bedrock =
    noEmbeddings ? null : new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

  const { data: rows, error: selErr } = await supabase.from("restaurants").select(`
    id,
    name,
    cuisine_tags,
    price_tier,
    location_geog,
    embedding,
    hours,
    photo_urls,
    google_place_id,
    phone_e164
  `);
  if (selErr) throw selErr;

  let updated = 0;
  let skipped = 0;

  for (const row of rows || []) {
    const patch = {};
    const cuisineTags = isBlankCuisineTags(row.cuisine_tags)
      ? inferCuisineTagsFromName(row.name)
      : row.cuisine_tags;

    if (isBlankCuisineTags(row.cuisine_tags)) {
      patch.cuisine_tags = cuisineTags;
    }
    if (row.price_tier == null) {
      patch.price_tier = defaultPriceTier(row.id);
    }
    if (row.location_geog == null || row.location_geog === "") {
      patch.location_geog = defaultDemoPointWkt(row.id);
    }
    if (isBlankHours(row.hours)) {
      patch.hours = defaultDemoHours();
    }
    if (isBlankPhotoUrls(row.photo_urls)) {
      patch.photo_urls = pickDemoPhotos(row.id, 3);
    }
    if (row.phone_e164 == null || String(row.phone_e164).trim() === "") {
      patch.phone_e164 = syntheticPhoneE164(row.id);
    }
    if (row.google_place_id == null || String(row.google_place_id).trim() === "") {
      patch.google_place_id = `seed:${row.id}`;
    }

    const needsEmbedding =
      row.embedding == null ||
      (typeof row.embedding === "string" && row.embedding.trim() === "") ||
      (Array.isArray(row.embedding) && row.embedding.length === 0);

    if (needsEmbedding && !noEmbeddings && bedrock) {
      const text = embeddingTextForRow(row, cuisineTags);
      const emb = await embedOne(bedrock, embedModel, text);
      patch.embedding = vecToPgLiteral(emb);
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log("[dry-run] would update", row.id, row.name, Object.keys(patch));
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

  console.log(
    dryRun ? `\nDry run: would update ${updated} row(s), ${skipped} unchanged.` : `\nUpdated ${updated} row(s), ${skipped} unchanged.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
