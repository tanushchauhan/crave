/**
 * CRAVE Supabase demo seed (UT Austin near campus).
 * Run from tools/supabase-seed: npm install && npm run seed
 *
 * Backfill existing rows with missing demo fields (without touching image_embedding,
 * yelp_id, owner_user_id): npm run fill-blanks [--dry-run] [--no-embeddings]
 *
 * Env (repo-root .env or tools/supabase-seed/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (+ AWS_SESSION_TOKEN if temp creds)
 *   BEDROCK_EMBEDDING_TEXT_MODEL_ID (default amazon.titan-embed-text-v1)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

import {
  defaultDemoHours,
  pickDemoPhotos,
  syntheticPhoneE164,
} from "./lib/restaurant-dummies.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** CRAVE-specific UUIDv5 namespace (RFC 4122 DNS namespace would work; this is arbitrary but stable). */
const UUID_NS = "a1b2c3d4-e5f6-5a7b-8c9d-0e1f2a3b4c5d";

function parseUuidToBuffer(uuid) {
  const hex = uuid.replace(/-/g, "");
  return Buffer.from(hex, "hex");
}

function uuidv5(name, namespaceUuid = UUID_NS) {
  const ns = parseUuidToBuffer(namespaceUuid);
  const hash = createHash("sha1").update(Buffer.concat([ns, Buffer.from(String(name), "utf8")])).digest();
  const b = Buffer.alloc(16);
  hash.copy(b, 0, 0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

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

async function pooledMap(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

function vecToPgLiteral(vec) {
  if (!vec?.length) return null;
  return `[${vec.join(",")}]`;
}

async function fetchOverpassRestaurants({ lat, lng, radiusM }) {
  const q = `
[out:json][timeout:45];
(
  node["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  way["amenity"="restaurant"](around:${radiusM},${lat},${lng});
  relation["amenity"="restaurant"](around:${radiusM},${lat},${lng});
);
out center tags;
`;
  const body = `data=${encodeURIComponent(q)}`;
  const urls = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": "CRAVE-supabase-seed/1.0",
    Accept: "*/*",
  };
  let lastErr;
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body,
        });
        if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
        const json = await res.json();
        const els = json.elements || [];
        const out = [];
        for (const el of els) {
          const tags = el.tags || {};
          const name = tags.name?.trim();
          if (!name) continue;
          let plat = el.lat;
          let plng = el.lon;
          if (el.center) {
            plat = el.center.lat;
            plng = el.center.lon;
          }
          if (plat == null || plng == null) continue;
          const cuisines = [];
          for (const k of Object.keys(tags)) {
            if (k === "cuisine") {
              for (const part of String(tags[k]).split(/[;,]/)) {
                const c = part.trim().toLowerCase();
                if (c) cuisines.push(c);
              }
            }
          }
          if (cuisines.length === 0) cuisines.push("restaurant");
          const id =
            el.type === "node" ? `osm:node/${el.id}` : el.type === "way" ? `osm:way/${el.id}` : `osm:rel/${el.id}`;
          out.push({
            google_place_id: id,
            name,
            cuisine_tags: [...new Set(cuisines)].slice(0, 8),
            price_tier: 2,
            lat: plat,
            lng: plng,
            phone_e164: tags["contact:phone"]?.replace(/\s/g, "") || tags.phone?.replace(/\s/g, "") || null,
            is_crave_partner: false,
            owner_user_id: null,
          });
        }
        return out;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  console.warn("overpass_failed", lastErr?.message);
  return [];
}

function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeAgainstCurated(overpassRows, curatedNames) {
  const curatedSet = new Set(curatedNames.map(normalizeName));
  return overpassRows.filter((r) => !curatedSet.has(normalizeName(r.name)));
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

async function embedTextsParallel(bedrock, modelId, strings, concurrency, noEmbeddings) {
  if (noEmbeddings) return strings.map(() => null);
  return pooledMap(strings, concurrency, async (s) => {
    if (!s) return null;
    return embedOne(bedrock, modelId, s);
  });
}

function phoneDigits(p) {
  return String(p || "").replace(/\D/g, "");
}

function seedPhoneDigitSet() {
  const path = join(__dirname, "data", "demo-users.json");
  const set = new Set();
  if (!existsSync(path)) return set;
  for (const u of JSON.parse(readFileSync(path, "utf8"))) {
    const d = phoneDigits(u.phone_e164);
    if (d) set.add(d);
  }
  return set;
}

async function wipeDemoTables(supabase) {
  const seedPhoneDigits = seedPhoneDigitSet();
  const nz = "00000000-0000-0000-0000-000000000000";
  const delById = async (table) => {
    const { error } = await supabase.from(table).delete().neq("id", nz);
    if (error) console.warn("delete", table, error.message);
  };
  await delById("item_feedback");
  await delById("order_items");
  await delById("orders");
  await delById("bookings");
  const { error: gmErr } = await supabase.from("group_members").delete().not("joined_at", "is", null);
  if (gmErr) console.warn("delete group_members", gmErr.message);
  await delById("dining_groups");
  await delById("contacts");
  const { error: dcErr } = await supabase.from("dietary_constraints").delete().not("constraint_type", "is", null);
  if (dcErr) console.warn("delete dietary_constraints", dcErr.message);
  await delById("menu_items");
  await delById("restaurants");
  await delById("user_pref_updates");
  let page = 1;
  for (;;) {
    const { data: batch } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    const users = batch?.users || [];
    for (const u of users) {
      const pd = phoneDigits(u.phone);
      const isSeedPhone = pd && seedPhoneDigits.has(pd);
      if (isSeedPhone || u.user_metadata?.crave_seed === true) {
        const { error } = await supabase.auth.admin.deleteUser(u.id);
        if (error) console.warn("delete_user", u.phone || u.id, error.message);
      }
    }
    if (users.length < 200) break;
    page += 1;
  }
}

async function upsertRestaurant(supabase, row, embedding) {
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .eq("google_place_id", row.google_place_id)
    .maybeSingle();

  const stableKey = row.google_place_id || row.name;
  const base = {
    name: row.name,
    cuisine_tags: row.cuisine_tags,
    price_tier: row.price_tier,
    hours: defaultDemoHours(),
    photo_urls: pickDemoPhotos(stableKey, 3),
    yelp_id: null,
    google_place_id: row.google_place_id,
    phone_e164: row.phone_e164 || syntheticPhoneE164(stableKey),
    is_crave_partner: row.is_crave_partner,
    owner_user_id: row.owner_user_id,
    embedding: embedding ? vecToPgLiteral(embedding) : null,
    image_embedding: null,
  };

  const withGeo =
    row.lat != null && row.lng != null
      ? { ...base, location_geog: `SRID=4326;POINT(${row.lng} ${row.lat})` }
      : { ...base };

  async function write(payload, idIfUpdate) {
    if (idIfUpdate) {
      const { error } = await supabase.from("restaurants").update(payload).eq("id", idIfUpdate);
      if (error) throw error;
      return idIfUpdate;
    }
    const { data, error } = await supabase.from("restaurants").insert(payload).select("id").single();
    if (error) throw error;
    return data.id;
  }

  if (existing?.id) {
    try {
      return await write(withGeo, existing.id);
    } catch (e) {
      console.warn("restaurant_geo_update_failed", row.name, e?.message);
      return await write({ ...base }, existing.id);
    }
  }

  try {
    return await write(withGeo, null);
  } catch (e) {
    console.warn("restaurant_geo_insert_failed", row.name, e?.message);
    return await write({ ...base }, null);
  }
}

async function ensureAuthUser(supabase, { id, phone_e164, display_name }) {
  const want = phoneDigits(phone_e164);
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({
    id,
    phone: phone_e164,
    phone_confirm: true,
    user_metadata: { display_name, crave_seed: true },
  });
  if (!cErr && created?.user?.id) return created.user.id;
  if (cErr && !/already|registered|exists/i.test(String(cErr.message))) {
    console.warn("createUser", phone_e164, cErr.message);
  }
  let page = 1;
  for (;;) {
    const { data: batch, error: lErr } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (lErr) throw lErr;
    const found = batch?.users?.find((u) => phoneDigits(u.phone) === want);
    if (found?.id) return found.id;
    if (!batch?.users?.length || batch.users.length < 200) break;
    page += 1;
  }
  throw new Error(`Could not create or resolve user ${phone_e164}`);
}

async function main() {
  loadEnv();
  const args = new Set(process.argv.slice(2));
  const doReset = args.has("--reset");
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

  const bedrock = noEmbeddings ? null : new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

  if (doReset) {
    console.log("--reset: clearing demo tables + demo auth users");
    await wipeDemoTables(supabase);
  }

  const curated = JSON.parse(readFileSync(join(__dirname, "data", "curated-partners.json"), "utf8"));
  const demoUsers = JSON.parse(readFileSync(join(__dirname, "data", "demo-users.json"), "utf8"));

  console.log("Fetching Overpass…");
  let overpass = await fetchOverpassRestaurants({ lat: 30.2849, lng: -97.7341, radiusM: 2400 });
  overpass = dedupeAgainstCurated(
    overpass,
    curated.map((c) => c.name),
  );
  console.log("Overpass restaurants (after dedupe):", overpass.length);

  const userIds = {};
  const userEmbStrings = demoUsers.map((u) => u.preference_text);
  const userEmb = await embedTextsParallel(bedrock, embedModel, userEmbStrings, 4, noEmbeddings);

  console.log("Creating demo auth users…");
  for (let i = 0; i < demoUsers.length; i++) {
    const u = demoUsers[i];
    const id = uuidv5(`crave:demo-user:${u.slug}`);
    const uid = await ensureAuthUser(supabase, {
      id,
      phone_e164: u.phone_e164,
      display_name: u.display_name,
    });
    userIds[u.slug] = uid;

    const pref = userEmb[i] ? vecToPgLiteral(userEmb[i]) : null;
    const { error: upErr } = await supabase
      .from("users")
      .update({
        display_name: u.display_name,
        phone: u.phone_e164 || null,
        venmo_handle: u.venmo_handle,
        cashapp_handle: u.cashapp_handle,
        pref_embedding: pref,
      })
      .eq("id", uid);
    if (upErr) console.warn("update public.users", u.slug, upErr.message);

    if (u.dietary?.length) {
      for (const d of u.dietary) {
        await supabase.from("dietary_constraints").upsert(
          { user_id: uid, constraint_type: d.constraint_type, hard: d.hard },
          { onConflict: "user_id,constraint_type" },
        );
      }
    }
  }

  const ownerId = userIds["alex-owner"];

  const curatedRows = curated.map((c) => ({
    google_place_id: `curated:${c.slug}`,
    name: c.name,
    cuisine_tags: c.cuisine_tags,
    price_tier: c.price_tier,
    lat: c.lat,
    lng: c.lng,
    phone_e164: c.phone_e164,
    is_crave_partner: true,
    owner_user_id: ownerId,
    menu: c.menu,
  }));

  const restStrings = [...curatedRows, ...overpass].map(
    (r) => `${r.name}. Cuisine: ${(r.cuisine_tags || []).join(", ")}. Near UT Austin, Texas.`,
  );
  const restEmb = await embedTextsParallel(bedrock, embedModel, restStrings, 8, noEmbeddings);

  console.log("Upserting restaurants…");
  const restaurantIdByKey = {};
  const allRest = [...curatedRows, ...overpass];
  for (let i = 0; i < allRest.length; i++) {
    const r = allRest[i];
    const id = await upsertRestaurant(supabase, r, restEmb[i]);
    restaurantIdByKey[r.google_place_id] = id;
  }

  console.log("Replacing partner menu_items…");
  const partnerRidList = curatedRows.map((c) => restaurantIdByKey[c.google_place_id]);
  await supabase.from("menu_items").delete().in("restaurant_id", partnerRidList);

  for (const c of curatedRows) {
    const rid = restaurantIdByKey[c.google_place_id];
    const texts = c.menu.map((m) => `${m.name}. ${m.description || ""}`.trim());
    const embs = await embedTextsParallel(bedrock, embedModel, texts, 8, noEmbeddings);
    for (let j = 0; j < c.menu.length; j++) {
      const m = c.menu[j];
      const { error } = await supabase.from("menu_items").insert({
        restaurant_id: rid,
        name: m.name,
        description: m.description || null,
        price_cents: m.price_cents,
        image_url: null,
        embedding: embs[j] ? vecToPgLiteral(embs[j]) : null,
        image_embedding: null,
        is_available: true,
      });
      if (error) throw new Error(`menu insert ${c.slug}: ${error.message}`);
    }
  }

  const groupSpecs = [
    { name: "The Boys", tag: "with the boys", slug: "the-boys", members: ["alex-owner", "sam", "jordan", "taylor"] },
    { name: "Date Night", tag: "date night", slug: "date-night", members: ["alex-owner", "riley"] },
    { name: "Family Dinner", tag: "family dinner", slug: "family-dinner", members: ["alex-owner", "morgan", "drew"] },
  ];

  console.log("Upserting dining_groups + members + contacts…");
  for (const g of groupSpecs) {
    const gid = uuidv5(`crave:group:${g.slug}`);
    const ownerSlug = g.members[0];
    const ownerUid = userIds[ownerSlug];
    const { error: gErr } = await supabase.from("dining_groups").upsert(
      { id: gid, name: g.name, owner_id: ownerUid, context_tag: g.tag },
      { onConflict: "id" },
    );
    if (gErr) console.warn("dining_groups", g.name, gErr.message);
    await supabase.from("group_members").delete().eq("group_id", gid);
    for (const slug of g.members) {
      await supabase.from("group_members").insert({ group_id: gid, user_id: userIds[slug] });
    }
    for (const slug of g.members) {
      if (slug === ownerSlug) continue;
      await supabase.from("contacts").upsert(
        {
          owner_user_id: ownerUid,
          contact_user_id: userIds[slug],
          label: demoUsers.find((x) => x.slug === slug)?.display_name || slug,
        },
        { onConflict: "owner_user_id,contact_user_id" },
      );
    }
  }

  const partnerIds = curatedRows.map((c) => restaurantIdByKey[c.google_place_id]);
  const { data: allMenus } = await supabase.from("menu_items").select("id, restaurant_id, price_cents, name").in("restaurant_id", partnerIds);
  const menusByRest = {};
  for (const m of allMenus || []) {
    (menusByRest[m.restaurant_id] ||= []).push(m);
  }

  const nonPartnerIds = Object.entries(restaurantIdByKey)
    .filter(([k]) => k.startsWith("osm:"))
    .map(([, v]) => v)
    .slice(0, 12);

  console.log("Seeding bookings…");
  const bookingSpecs = [];
  let bi = 0;
  const statuses = ["confirmed", "confirmed", "completed", "completed", "pending"];
  const sources = ["partner_app", "partner_app", "phone_call_logged"];
  for (const rid of partnerIds) {
    for (let k = 0; k < 3; k++) {
      const daysAgo = 1 + ((bi * 3) % 14);
      const scheduled = new Date(Date.now() - daysAgo * 86400000 + k * 3600000).toISOString();
      bookingSpecs.push({
        id: uuidv5(`crave:booking:${bi++}`),
        user_id: userIds[["alex-owner", "sam", "jordan", "riley"][k % 4]],
        group_id: uuidv5("crave:group:the-boys"),
        restaurant_id: rid,
        party_size: 2 + (k % 4),
        scheduled_at: scheduled,
        status: statuses[bi % statuses.length],
        source: "partner_app",
        voice_transcript: k === 0 ? "Book a table for four near campus." : null,
        dietary_notes: k === 2 ? "One vegetarian entree please." : null,
        context_tag: ["with the boys", "date night", "family dinner"][k % 3],
      });
    }
  }
  for (let k = 0; k < 5; k++) {
    bookingSpecs.push({
      id: uuidv5(`crave:booking:${bi++}`),
      user_id: userIds["alex-owner"],
      group_id: uuidv5("crave:group:date-night"),
      restaurant_id: partnerIds[k % partnerIds.length],
      party_size: 2,
      scheduled_at: new Date(Date.now() + (k + 1) * 86400000).toISOString(),
      status: "pending",
      source: "partner_app",
      voice_transcript: "Anniversary dinner, quieter table if possible.",
      dietary_notes: null,
      context_tag: "date night",
    });
  }
  for (const rid of nonPartnerIds.slice(0, 8)) {
    bookingSpecs.push({
      id: uuidv5(`crave:booking:${bi++}`),
      user_id: userIds["casey"],
      group_id: null,
      restaurant_id: rid,
      party_size: 3,
      scheduled_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: "confirmed",
      source: "phone_call_logged",
      voice_transcript: null,
      dietary_notes: "Called ahead; host confirmed verbally.",
      context_tag: "friends",
    });
  }

  for (const b of bookingSpecs) {
    const { error } = await supabase.from("bookings").upsert(b, { onConflict: "id" });
    if (error) console.warn("booking", b.id, error.message);
  }

  console.log("Seeding orders + order_items…");
  let oi = 0;
  for (let o = 0; o < 22; o++) {
    const rid = partnerIds[o % partnerIds.length];
    const items = menusByRest[rid] || [];
    if (items.length < 2) continue;
    const oid = uuidv5(`crave:order:${oi++}`);
    const pick = [items[o % items.length], items[(o + 1) % items.length]];
    const total = pick.reduce((s, it) => s + it.price_cents, 0);
    const st = ["pending", "confirmed", "preparing", "ready", "completed"][o % 5];
    const { error: oe } = await supabase.from("orders").upsert(
      {
        id: oid,
        user_id: userIds[["alex-owner", "sam", "jordan"][o % 3]],
        restaurant_id: rid,
        status: st,
        total_cents: total,
        voice_transcript_summary: "Voice order: two mains and a drink.",
      },
      { onConflict: "id" },
    );
    if (oe) console.warn("order", oid, oe.message);
    await supabase.from("order_items").delete().eq("order_id", oid);
    for (const it of pick) {
      const { error: ie } = await supabase.from("order_items").insert({
        order_id: oid,
        menu_item_id: it.id,
        quantity: 1,
        price_cents: it.price_cents,
      });
      if (ie) console.warn("order_item", ie.message);
    }
  }

  console.log("Seeding item_feedback…");
  let fi = 0;
  const feedbackUsers = ["sam", "jordan", "riley", "taylor", "casey"];
  for (const m of allMenus || []) {
    if (fi >= 72) break;
    const liked = fi % 10 < 7;
    const uid = userIds[feedbackUsers[fi % feedbackUsers.length]];
    const fid = uuidv5(`crave:feedback:${fi++}`);
    const { error } = await supabase.from("item_feedback").upsert(
      {
        id: fid,
        user_id: uid,
        restaurant_id: m.restaurant_id,
        menu_item_id: m.id,
        raw_item_text: null,
        liked,
        source: "bill_split",
      },
      { onConflict: "id" },
    );
    if (error) console.warn("feedback", fid, error.message);
  }

  const counts = [
    "restaurants",
    "menu_items",
    "users",
    "dining_groups",
    "group_members",
    "contacts",
    "bookings",
    "orders",
    "order_items",
    "item_feedback",
  ];
  console.log("\n=== Row counts ===");
  for (const t of counts) {
    const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) console.log(t, "?", error.message);
    else console.log(t, count);
  }

  console.log(
    "\nDone. Partner owner: alex-owner (+18005550101, test OTP from Dashboard). Run from repo:"
  );
  console.log("  cd tools/supabase-seed && npm install && npm run seed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
