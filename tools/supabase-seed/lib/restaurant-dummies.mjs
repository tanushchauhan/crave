/**
 * Shared dummy data for restaurants.photo_urls, hours, and geo defaults.
 * Used by seed-supabase.mjs and fill-restaurant-blanks.mjs.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** UT Austin area — base point for jittered demo coordinates. */
const BASE_LNG = -97.7341;
const BASE_LAT = 30.2849;

let _cachedPool = null;

function loadPhotoPool() {
  if (_cachedPool) return _cachedPool;
  const path = join(__dirname, "..", "data", "restaurant-demo-photos.json");
  if (!existsSync(path)) {
    _cachedPool = [];
    return _cachedPool;
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  _cachedPool = Array.isArray(raw) ? raw.filter((u) => typeof u === "string" && u.trim()) : [];
  return _cachedPool;
}

/** Stable 32-bit unsigned int from UUID string (or any string). */
export function hashStringToUint32(s) {
  const h = createHash("sha256").update(String(s), "utf8").digest();
  return h.readUInt32BE(0);
}

/**
 * Pick `count` distinct demo photo URLs deterministically from the pool.
 * @param {string} restaurantId
 * @param {number} [count=3]
 * @returns {string[]}
 */
export function pickDemoPhotos(restaurantId, count = 3) {
  const pool = loadPhotoPool();
  if (pool.length === 0) return [];
  const n = Math.min(Math.max(1, count), pool.length);
  const h = hashStringToUint32(restaurantId);
  const start = pool.length > 1 ? h % pool.length : 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(pool[(start + i) % pool.length]);
  }
  return [...new Set(out)];
}

export function defaultDemoHours() {
  return {
    weekdays: "11:00–22:00",
    weekends: "10:00–23:00",
    note: "Demo hours — call venue to confirm",
  };
}

/**
 * WKT geography point with small stable jitter (meters-scale) for map spread.
 * @param {string} restaurantId
 * @returns {string} e.g. SRID=4326;POINT(-97.73 30.28)
 */
export function defaultDemoPointWkt(restaurantId) {
  const h = hashStringToUint32(`geo:${restaurantId}`);
  const jitterLng = ((h & 0xffff) / 0xffff - 0.5) * 0.04;
  const jitterLat = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.04;
  const lng = BASE_LNG + jitterLng;
  const lat = BASE_LAT + jitterLat;
  return `SRID=4326;POINT(${lng} ${lat})`;
}

export function defaultPriceTier(restaurantId) {
  return (hashStringToUint32(`tier:${restaurantId}`) % 4) + 1;
}

const NAME_KEYWORDS = [
  [/taco|mexican|tex-mex|burrito/i, ["mexican", "tacos"]],
  [/thai|pad thai|curry/i, ["thai", "asian"]],
  [/indian|naan|tandoor/i, ["indian", "curry"]],
  [/burger|wings|bar|grill/i, ["american", "burgers"]],
  [/coffee|espresso|latte|cafe|roaster/i, ["coffee", "cafe"]],
  [/sushi|japanese|ramen/i, ["japanese", "asian"]],
  [/pizza|italian|pasta/i, ["italian", "pizza"]],
  [/chinese|dim sum/i, ["chinese", "asian"]],
];

/**
 * @param {string} name
 * @returns {string[]}
 */
export function inferCuisineTagsFromName(name) {
  const s = String(name || "").trim();
  if (!s) return ["restaurant", "dining"];
  for (const [re, tags] of NAME_KEYWORDS) {
    if (re.test(s)) return [...tags];
  }
  return ["restaurant", "dining"];
}

/**
 * @param {unknown} tags
 */
export function isBlankCuisineTags(tags) {
  return !Array.isArray(tags) || tags.length === 0;
}

/**
 * @param {unknown} hours
 */
export function isBlankHours(hours) {
  if (hours == null) return true;
  if (typeof hours === "object" && !Array.isArray(hours) && Object.keys(hours).length === 0) {
    return true;
  }
  return false;
}

/**
 * @param {unknown} photoUrls
 */
export function isBlankPhotoUrls(photoUrls) {
  return !Array.isArray(photoUrls) || photoUrls.length === 0 || !photoUrls.some(Boolean);
}

/**
 * Synthetic E.164-style phone for demo (555 exchange).
 * @param {string} restaurantId
 */
export function syntheticPhoneE164(restaurantId) {
  const n = hashStringToUint32(`phone:${restaurantId}`) % 10000000;
  return `+1555${String(n).padStart(7, "0")}`;
}
