/**
 * CRAVE — POST /ads/generate
 * Next.js sends { prompt, images[] } (base64 strings, optional data URL prefix).
 * Returns { designs: [ { style, caption, hashtags, images[] } x3 ] } — each images length ≤ 3 (PNG base64 / S3 URLs).
 *
 * Pipeline:
 *  1. Converse (Sonnet) → 3 designs with style/caption/hashtags/image_prompts.
 *  2. Hero PNG per slide via Nova Canvas or Stability SD3.5 (text-to-image, NO baked-in text).
 *  3. Converse (Sonnet) → per-slide JSX-as-JSON layout tree (Satori-flavored, flexbox only).
 *  4. Satori (HTML/CSS subset) + Noto Sans → SVG → @resvg/resvg-js → PNG overlay.
 *  5. Sharp composites hero + overlay PNG + (optional) logo PNG.
 *
 * Env: BEDROCK_TEXT_MODEL_ID (Converse, e.g. Claude Sonnet 4), AD_IMAGE_MODEL_ID (Nova Canvas or Stability SD3.5 id).
 * AD_OVERLAY_WITH_SVG=true (default): generate the layout overlay. Set to "false" to skip overlay entirely.
 * AD_OVERLAY_RENDERER=satori (default; only supported value — kept for forward compat).
 * AD_NOVA_QUALITY=premium|standard, AD_LOGO_IMAGE_INDEX=-1 (last ref image as logo), AD_IMAGE_ASPECT_RATIO for Stability.
 * AD_MAX_SLIDES_PER_DESIGN=1–3 (default 3). HTTP API max integration is 30s — use Lambda function URL or lower slides.
 * AD_BUNDLE_CJK_FONT=true to bundle Noto Sans SC at zip time for CJK glyphs (off by default to keep zip small).
 * Emojis in JSON captions/hashtags are preserved; emojis are stripped from on-image strings server-side.
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NUM_DESIGNS = 3;
const MAX_IMAGES_PER_POST = 3;

/** Cap slides per design (1–3). HTTP API → Lambda integration max is 30s; lower this if you only use API Gateway. */
function maxSlidesCap() {
  const n = Number(process.env.AD_MAX_SLIDES_PER_DESIGN);
  if (!Number.isFinite(n) || n < 1) return MAX_IMAGES_PER_POST;
  return Math.min(MAX_IMAGES_PER_POST, Math.floor(n));
}
const MAX_INPUT_IMAGES = 12;
const MAX_INPUT_BYTES = 14 * 1024 * 1024;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

// ── Font loading (module-level cache, populated on first slide) ────────────────

let fontsCache = null;

function loadFontsOnce() {
  if (fontsCache) return fontsCache;
  const regPath = join(__dirname, "fonts", "NotoSans-Regular.ttf");
  const boldPath = join(__dirname, "fonts", "NotoSans-Bold.ttf");
  const cjkPath = join(__dirname, "fonts", "NotoSansSC-Regular.otf");
  const fonts = [];
  if (existsSync(regPath)) {
    fonts.push({ name: "Noto Sans", data: readFileSync(regPath), weight: 400, style: "normal" });
  } else {
    console.warn("font_missing", regPath, "— Satori overlay will fail to render text");
  }
  if (existsSync(boldPath)) {
    fonts.push({ name: "Noto Sans", data: readFileSync(boldPath), weight: 700, style: "normal" });
  }
  if (existsSync(cjkPath)) {
    fonts.push({ name: "Noto Sans", data: readFileSync(cjkPath), weight: 400, style: "normal" });
  }
  fontsCache = fonts;
  return fontsCache;
}

// ── Sanitization ───────────────────────────────────────────────────────────────

// Strip Extended_Pictographic codepoints (covers emoji, symbols), plus regional indicators / VS-16 / ZWJ glue.
const EMOJI_RE = /(\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200D|\uFE0F|[\u{1F1E6}-\u{1F1FF}])/gu;

function stripEmoji(s) {
  if (typeof s !== "string") return s;
  return s.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}

const ALLOWED_TAGS = new Set(["div", "span"]);
const ALLOWED_CSS_KEYS = new Set([
  "display",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "alignSelf",
  "alignContent",
  "flexWrap",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "gap",
  "rowGap",
  "columnGap",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "color",
  "backgroundColor",
  "background",
  "borderRadius",
  "border",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "boxShadow",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "textShadow",
  "textDecoration",
  "opacity",
  "overflow",
  "whiteSpace",
  "wordBreak",
]);

const MAX_DEPTH = 6;
const MAX_CHILDREN = 10;
const MAX_TEXT_LEN = 200;

function sanitizeStyle(style) {
  if (!style || typeof style !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(style)) {
    if (!ALLOWED_CSS_KEYS.has(k)) continue;
    if (v == null) continue;
    if (typeof v === "string" && v.length > 200) continue;
    if (typeof v === "string" && /position\s*:\s*absolute|position\s*:\s*fixed/i.test(v)) continue;
    out[k] = v;
  }
  // Force fontFamily to bundled font.
  if (out.fontFamily) out.fontFamily = "Noto Sans";
  return out;
}

/** Convert validated tree node → Satori React-element-shaped object: { type, props: { style, children } }. */
function sanitizeNode(node, depth = 0) {
  if (depth > MAX_DEPTH) return null;
  if (node == null) return null;

  if (typeof node === "string" || typeof node === "number") {
    let s = String(node);
    if (s.length > MAX_TEXT_LEN) s = s.slice(0, MAX_TEXT_LEN);
    s = stripEmoji(s);
    if (!s) return null;
    return s;
  }

  if (typeof node !== "object") return null;

  const type = String(node.type || "div").toLowerCase();
  if (!ALLOWED_TAGS.has(type)) return null;

  const style = sanitizeStyle(node.style);

  let children = node.children;
  let outChildren;
  if (Array.isArray(children)) {
    outChildren = [];
    for (const c of children.slice(0, MAX_CHILDREN)) {
      const sc = sanitizeNode(c, depth + 1);
      if (sc != null && sc !== "") outChildren.push(sc);
    }
    if (outChildren.length === 0) outChildren = undefined;
    else if (outChildren.length === 1) outChildren = outChildren[0];
  } else if (children != null) {
    const sc = sanitizeNode(children, depth + 1);
    if (sc != null && sc !== "") outChildren = sc;
  }

  return { type, props: { style, children: outChildren } };
}

function fallbackTree({ width, height, headline, subline }) {
  const headSafe = stripEmoji(headline || "Limited Time Offer").slice(0, 40) || "Limited Time Offer";
  const subSafe = stripEmoji(subline || "").slice(0, 80);
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        width: `${width}px`,
        height: `${height}px`,
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "48px",
      },
      children: {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(0,0,0,0.55)",
            color: "#ffffff",
            padding: "20px 28px",
            borderRadius: 24,
            alignSelf: "flex-start",
            maxWidth: Math.round(width * 0.7),
            fontFamily: "Noto Sans",
          },
          children: subSafe
            ? [
                {
                  type: "div",
                  props: {
                    style: { fontSize: 64, fontWeight: 800, lineHeight: 1.05, color: "#ffffff" },
                    children: headSafe,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { fontSize: 28, fontWeight: 600, opacity: 0.92, color: "#ffffff", marginTop: 8 },
                    children: subSafe,
                  },
                },
              ]
            : {
                type: "div",
                props: {
                  style: { fontSize: 64, fontWeight: 800, lineHeight: 1.05, color: "#ffffff" },
                  children: headSafe,
                },
              },
        },
      },
    },
  };
}

// ── Generic helpers ────────────────────────────────────────────────────────────

function getHeader(headers, name) {
  if (!headers) return undefined;
  const h = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [String(k).toLowerCase(), v]),
  );
  return h[name.toLowerCase()];
}

function parseBody(event) {
  let raw = event.body ?? "{}";
  if (event.isBase64Encoded && typeof raw === "string") {
    raw = Buffer.from(raw, "base64").toString("utf8");
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function response(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { "content-type": "application/json", ...cors },
    body: JSON.stringify(bodyObj),
  };
}

function stripDataUrl(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  const m = t.match(/^data:([^;]+);base64,(.+)$/i);
  if (m) return { contentType: m[1].toLowerCase(), base64: m[2] };
  return { contentType: null, base64: t };
}

function sniffFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.toString("ascii", 1, 4) === "PNG") return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "webp";
  return "png";
}

function decodeInputImages(imagesField) {
  if (!Array.isArray(imagesField)) return { error: "images_must_be_array" };
  if (imagesField.length > MAX_INPUT_IMAGES) return { error: "too_many_input_images", max: MAX_INPUT_IMAGES };

  const parts = [];
  let total = 0;
  for (let i = 0; i < imagesField.length; i++) {
    const parsed = stripDataUrl(imagesField[i]);
    if (!parsed?.base64) return { error: "invalid_image_entry", index: i };
    let buf;
    try {
      buf = Buffer.from(parsed.base64, "base64");
    } catch {
      return { error: "invalid_base64", index: i };
    }
    if (!buf.length) return { error: "empty_image", index: i };
    total += buf.length;
    if (total > MAX_INPUT_BYTES) return { error: "input_images_too_large", maxBytes: MAX_INPUT_BYTES };
    const fmt = parsed.contentType?.includes("jpeg")
      ? "jpeg"
      : parsed.contentType?.includes("webp")
        ? "webp"
        : parsed.contentType?.includes("png")
          ? "png"
          : sniffFormat(buf);
    parts.push({ bytes: buf, format: fmt === "jpg" ? "jpeg" : fmt });
  }
  return { parts };
}

function extractConverseText(out) {
  const blocks = out?.output?.message?.content || [];
  return blocks.filter((b) => b.text).map((b) => b.text).join("\n").trim();
}

function parseFirstJsonObject(text) {
  if (!text) return null;
  const t = text.replace(/```json\s*/gi, "```").replace(/```\s*/g, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

const FALLBACK_SCENE =
  "Premium editorial still life inspired by the brief, soft diffused light, tasteful props, high-end social ad aesthetic, absolutely no text no letters no logos no watermarks no signage";

function normalizeDesigns(raw) {
  const arr = raw?.designs ?? raw?.posts ?? raw?.variants;
  if (!Array.isArray(arr)) return null;
  const padded = arr.slice(0, NUM_DESIGNS);
  while (padded.length < NUM_DESIGNS) padded.push({});

  const out = [];
  for (let i = 0; i < NUM_DESIGNS; i++) {
    const d = padded[i] || {};
    const style = String(d.style ?? d.style_name ?? d.name ?? `Design ${i + 1}`).slice(0, 120);
    const caption = String(d.caption ?? d.body ?? "").slice(0, 2200);
    let hashtags = d.hashtags;
    if (typeof hashtags === "string") {
      hashtags = hashtags.split(/\s+/).filter(Boolean);
    }
    if (!Array.isArray(hashtags)) hashtags = [];
    hashtags = hashtags.map((h) => String(h).trim()).filter(Boolean).slice(0, 30);

    let image_prompts = d.image_prompts ?? d.imagePrompts ?? d.scenes;
    if (!Array.isArray(image_prompts)) image_prompts = [];
    image_prompts = image_prompts
      .map((p) => String(p).trim())
      .filter(Boolean)
      .slice(0, maxSlidesCap());
    if (image_prompts.length === 0) image_prompts = [FALLBACK_SCENE];

    out.push({ style, caption, hashtags, image_prompts });
  }
  return out;
}

function buildConverseContent(prompt, imageParts) {
  const lines = [
    "You are a senior social creative director for Instagram.",
    "",
    "User brief (verbatim intent):",
    String(prompt).trim(),
    "",
    `Return ONLY valid JSON (no markdown fences) with this shape:`,
    `{`,
    `  "designs": [`,
    `    {`,
    `      "style": "short style label (e.g. Bold minimal, Editorial, Neon street)",`,
    `      "caption": "Instagram caption body only, no hashtags in this string",`,
    `      "hashtags": ["#tag1", "#tag2", ...],`,
    `      "image_prompts": ["...", ...]`,
    `    }`,
    `    // exactly ${NUM_DESIGNS} objects total`,
    `  ]`,
    `}`,
    "",
    `Rules:`,
    `- Exactly ${NUM_DESIGNS} designs; each must feel visually and tonally distinct.`,
    `- Each "image_prompts" array length must be between 1 and ${maxSlidesCap()} inclusive (carousel slides).`,
    `- If the user asks for fewer images in their brief, use fewer prompts (still at least 1). Never more than ${maxSlidesCap()}.`,
    `- Each image_prompt is ONLY for an image generator: describe scene, lighting, composition, mood. End every prompt with: absolutely no text, no letters, no numbers, no logos, no watermarks, no signage.`,
    `- Use the attached reference image(s) to stay on-brand and product-accurate when relevant.`,
    `- Captions: engaging, platform-native; hashtags relevant and mix branded + niche (no spam). Emojis OK in caption/hashtags.`,
  ];

  const content = [{ text: lines.join("\n") }];
  for (const { bytes, format } of imageParts) {
    content.push({ image: { format, source: { bytes } } });
  }
  return content;
}

async function runConverse(client, modelId, prompt, imageParts) {
  const out = await client.send(
    new ConverseCommand({
      modelId,
      messages: [{ role: "user", content: buildConverseContent(prompt, imageParts) }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.65 },
    }),
  );
  const text = extractConverseText(out);
  const parsed = parseFirstJsonObject(text);
  if (!parsed) {
    const err = new Error("converse_parse_failed");
    err.rawSnippet = text?.slice(0, 500);
    throw err;
  }
  const designs = normalizeDesigns(parsed);
  if (!designs) {
    const err = new Error("converse_invalid_designs_shape");
    err.rawSnippet = text?.slice(0, 500);
    throw err;
  }
  return designs;
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
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

function novaPixelSize() {
  const n = Number(process.env.AD_IMAGE_PIXEL_SIZE);
  if (Number.isFinite(n) && n >= 256 && n <= 1024) return Math.floor(n);
  return 768;
}

function novaQuality() {
  const q = (process.env.AD_NOVA_QUALITY || "premium").toLowerCase();
  return q === "standard" ? "standard" : "premium";
}

function useStabilityBackend(modelId) {
  return /stability\.|sd3-/i.test(modelId || "");
}

function overlayEnabled() {
  return (process.env.AD_OVERLAY_WITH_SVG || "true").toLowerCase() !== "false";
}

function overlayRendererName() {
  return (process.env.AD_OVERLAY_RENDERER || "satori").toLowerCase();
}

function pickLogoBytes(imageParts) {
  if (!imageParts?.length) return null;
  const raw = (process.env.AD_LOGO_IMAGE_INDEX || "-1").trim();
  let idx = parseInt(raw, 10);
  if (!Number.isFinite(idx) || idx < 0) idx = imageParts.length - 1;
  if (idx >= imageParts.length) idx = imageParts.length - 1;
  return imageParts[idx]?.bytes || null;
}

// ── Layout tree from Sonnet ────────────────────────────────────────────────────

async function buildLayoutTree(client, textModel, ctx) {
  const { width, height, userPrompt, scenePrompt, designStyle, slideIndex, thumbJpeg } = ctx;
  const logoSafePx = Math.round(width * 0.24);
  const lines = [
    `Pixel canvas: ${width} x ${height}.`,
    `Design style label: ${designStyle}. Carousel slide index: ${slideIndex + 1}.`,
    "",
    "USER_MARKETING_BRIEF (source of promo copy / codes — spell codes exactly):",
    userPrompt,
    "",
    "BACKGROUND_SCENE_PROMPT (this slide's photo — describe the photo under the overlay; do not echo this as visible text):",
    scenePrompt,
    "",
    "TASK: Output ONLY a JSON object describing a flexbox layout tree (Satori / React-element subset).",
    "",
    "Schema (strict):",
    `{`,
    `  "width": ${width},`,
    `  "height": ${height},`,
    `  "root": { "type": "div", "style": { ... }, "children": <node | node[] | string> }`,
    `}`,
    "",
    "Layout rules (Satori is flexbox-only via Yoga):",
    `- Allowed tags: "div" and "span" only.`,
    `- Every node may have a "style" object using ONLY these CSS keys: display, flexDirection, justifyContent, alignItems, alignSelf, alignContent, flexWrap, flex, flexGrow, flexShrink, flexBasis, gap, rowGap, columnGap, width, height, minWidth, minHeight, maxWidth, maxHeight, padding(*), margin(*), color, backgroundColor, background, borderRadius, border, borderWidth, borderColor, borderStyle, boxShadow, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textAlign, textTransform, textShadow, textDecoration, opacity, overflow, whiteSpace, wordBreak.`,
    `- Any container with multiple children MUST set display: "flex" and a flexDirection.`,
    `- DO NOT use position: absolute/fixed, transform, grid, float, or any unlisted property — they will be dropped.`,
    `- fontFamily MUST be "Noto Sans" (only bundled font). fontWeight 400 or 700.`,
    `- All sizes in px (number or "Npx"). Use rgba()/hex colors. Add semi-transparent panels (rgba(0,0,0,0.55) or similar) behind text on busy photos.`,
    `- Root must be width:${width}px, height:${height}px, display:"flex", padding:48 (or similar inset).`,
    `- LEAVE ${logoSafePx}px x ${logoSafePx}px CLEAR in the TOP-RIGHT for the brand logo (don't put text there).`,
    `- Vary the layout each slide: bottom card, side band, centered chip, split block, top banner — be creative but keep it on-canvas.`,
    "",
    "Copy rules:",
    `- Pull promo text (discount %, code like WOW10 spelled exactly, CTA) from USER_MARKETING_BRIEF.`,
    `- Strings must be ASCII / Latin only — NO emojis, NO non-Latin scripts (server will strip them anyway).`,
    `- Keep headlines short (≤ 6 words, ≤ 40 chars). Sublines ≤ 80 chars.`,
    "",
    "Output ONLY the JSON object. No markdown fences, no commentary.",
  ];

  const content = [{ text: lines.join("\n") }];
  if (thumbJpeg?.length) {
    content.push({ image: { format: "jpeg", source: { bytes: thumbJpeg } } });
  }

  const out = await client.send(
    new ConverseCommand({
      modelId: textModel,
      messages: [{ role: "user", content }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.85 },
    }),
  );
  const raw = extractConverseText(out);
  const parsed = parseFirstJsonObject(raw);
  if (!parsed || !parsed.root) return null;
  return parsed.root;
}

// ── Render overlay PNG via Satori + Resvg ──────────────────────────────────────

async function renderOverlayPng({ width, height, tree }) {
  const fonts = loadFontsOnce();
  if (!fonts.length) {
    throw new Error("no_fonts_bundled");
  }
  // Satori expects a React-element-shaped object: { type, props: { style, children } }.
  // sanitizeNode already returns that exact shape.
  const svg = await satori(tree, { width, height, fonts });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "rgba(0,0,0,0)",
  })
    .render()
    .asPng();
  return png;
}

async function mergeWithOverlay(basePng, overlayPng, logoBytes) {
  const meta = await sharp(basePng).metadata();
  const w = meta.width || 768;
  const h = meta.height || 768;
  let buf = await sharp(basePng).png().toBuffer();

  if (overlayPng?.length) {
    try {
      const overlayResized = await sharp(overlayPng)
        .resize(w, h, { fit: "fill" })
        .png()
        .toBuffer();
      buf = await sharp(buf).composite([{ input: overlayResized, blend: "over" }]).png().toBuffer();
    } catch (e) {
      console.warn("overlay_composite_failed", e?.message);
    }
  }

  if (logoBytes?.length) {
    try {
      const logoW = Math.max(48, Math.round(w * 0.18));
      const logoPng = await sharp(logoBytes).resize({ width: logoW, fit: "inside" }).png().toBuffer();
      const lm = await sharp(logoPng).metadata();
      const lw = lm.width || 1;
      const lh = lm.height || 1;
      const margin = Math.round(w * 0.028);
      const left = w - lw - margin;
      const top = margin;
      buf = await sharp(buf).composite([{ input: logoPng, left, top }]).png().toBuffer();
    } catch (e) {
      console.warn("logo_composite_failed", e?.message);
    }
  }

  return buf;
}

async function putPngPresignedGet(s3, bucket, key, pngBytes) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pngBytes,
      ContentType: "image/png",
    }),
  );
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 3600,
  });
}

async function runNovaImage(client, modelId, scenePrompt) {
  const px = novaPixelSize();
  const body = {
    taskType: "TEXT_IMAGE",
    textToImageParams: {
      text: scenePrompt,
      negativeText:
        "text, letters, words, typography, captions, labels, writing, numbers, watermark, logo, signage, UI, garbled text",
    },
    imageGenerationConfig: {
      numberOfImages: 1,
      height: px,
      width: px,
      cfgScale: 7.5,
      quality: novaQuality(),
      seed: Math.floor(Math.random() * 858_993_460),
    },
  };

  const out = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    }),
  );

  const json = JSON.parse(new TextDecoder().decode(out.body));
  if (json.error) throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
  const b64 = json.images?.[0];
  if (!b64) throw new Error("nova_empty_image");
  return b64;
}

/** Stability SD3.5 Large style payload (model id often `us.stability.sd3-5-large-v1:0` inference profile). */
async function runStabilityTextToImage(client, modelId, scenePrompt) {
  const aspect = (process.env.AD_IMAGE_ASPECT_RATIO || "4:5").trim() || "4:5";
  const body = {
    prompt: `${scenePrompt} Ultra high quality commercial food and beverage advertising photograph, dramatic appetizing lighting, shallow depth of field. Absolutely no overlaid text, typography, logos, or watermarks in the photograph itself.`,
    mode: "text-to-image",
    aspect_ratio: aspect,
    output_format: "png",
    negative_prompt:
      "text, typography, letters, watermark, logo, writing, signage, captions, UI, garbled text, deformed hands",
  };

  const out = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    }),
  );

  const json = JSON.parse(new TextDecoder().decode(out.body));
  if (json.finish_reasons?.[0] && json.finish_reasons[0] !== null) {
    console.warn("stability_finish", json.finish_reasons[0]);
  }
  const b64 = json.images?.[0];
  if (!b64) throw new Error("stability_empty_image");
  return b64;
}

async function runHeroImage(client, modelId, scenePrompt) {
  if (useStabilityBackend(modelId)) {
    return runStabilityTextToImage(client, modelId, scenePrompt);
  }
  return runNovaImage(client, modelId, scenePrompt);
}

async function finalizeSlidePng(client, textModel, userPrompt, designs, imageParts, job, heroB64) {
  let buf = Buffer.from(heroB64, "base64");
  if (!overlayEnabled()) return buf;

  const logoBuf = pickLogoBytes(imageParts);
  let overlayPng = null;

  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width || novaPixelSize();
    const h = meta.height || novaPixelSize();
    const thumbJpeg = await sharp(buf)
      .resize({ width: 480, height: 480, fit: "inside" })
      .jpeg({ quality: 86 })
      .toBuffer();

    let tree = null;
    try {
      const rawTree = await buildLayoutTree(client, textModel, {
        width: w,
        height: h,
        userPrompt,
        scenePrompt: job.prompt,
        designStyle: designs[job.di].style,
        slideIndex: job.pi,
        thumbJpeg,
      });
      tree = sanitizeNode(rawTree);
    } catch (e) {
      console.warn("layout_tree_failed", job.di, job.pi, e?.message);
    }

    if (!tree || typeof tree !== "object") {
      tree = sanitizeNode(
        fallbackTree({
          width: w,
          height: h,
          headline: designs[job.di].style,
          subline: (userPrompt || "").slice(0, 80),
        }),
      );
    }

    try {
      overlayPng = await renderOverlayPng({ width: w, height: h, tree });
    } catch (e) {
      console.warn("overlay_render_failed", job.di, job.pi, e?.message);
    }

    buf = await mergeWithOverlay(buf, overlayPng, logoBuf);
  } catch (e) {
    console.warn("finalize_slide_failed", job.di, job.pi, e?.message);
    if (logoBuf) {
      try {
        buf = await mergeWithOverlay(buf, null, logoBuf);
      } catch {}
    }
  }
  return buf;
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
  const path = event.rawPath ?? event.path ?? "";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (method !== "POST") {
    return response(405, { error: "method_not_allowed" });
  }

  const p = String(path);
  // API Gateway: /ads/generate. Lambda function URL: path is "/".
  const okPath = p.includes("ads/generate") || p === "/" || p === "";
  if (!okPath) {
    return response(404, { error: "not_found", path: p });
  }

  const auth = getHeader(event.headers, "authorization");
  if (!auth) {
    return response(401, { error: "missing_authorization" });
  }

  const body = parseBody(event);
  if (!body || typeof body !== "object") {
    return response(400, { error: "invalid_json" });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return response(400, { error: "prompt_required" });
  }

  const decoded = decodeInputImages(body.images ?? []);
  if (decoded.error) {
    return response(400, { error: decoded.error, ...decoded });
  }
  const imageParts = decoded.parts;

  const textModel =
    (process.env.BEDROCK_TEXT_MODEL_ID || "").trim() ||
    "us.anthropic.claude-sonnet-4-20250514-v1:0";
  const imageModel =
    (process.env.AD_IMAGE_MODEL_ID || "").trim() || "amazon.nova-canvas-v1:0";

  const client = new BedrockRuntimeClient({});

  let designs;
  try {
    designs = await runConverse(client, textModel, prompt, imageParts);
  } catch (e) {
    console.error("Converse failed", e?.message, e?.rawSnippet);
    return response(502, {
      error: "bedrock_converse_failed",
      message: e?.message || "unknown",
    });
  }

  const jobs = [];
  for (let di = 0; di < designs.length; di++) {
    const d = designs[di];
    for (let pi = 0; pi < d.image_prompts.length; pi++) {
      jobs.push({ di, pi, prompt: d.image_prompts[pi] });
    }
  }

  const concurrency = Math.min(
    6,
    Math.max(1, Number(body.concurrency) || 5),
  );

  let flatB64;
  try {
    // Phase 1: all hero frames in parallel (Nova / Stability).
    const withHeroes = await pooledMap(jobs, concurrency, async (job) => {
      const heroB64 = await runHeroImage(client, imageModel, job.prompt);
      return { job, heroB64 };
    });
    // Phase 2: layout-tree request + Satori overlay + logo composite, in parallel.
    flatB64 = await pooledMap(withHeroes, concurrency, async ({ job, heroB64 }) => {
      const pngBuf = await finalizeSlidePng(
        client,
        textModel,
        prompt,
        designs,
        imageParts,
        job,
        heroB64,
      );
      return pngBuf.toString("base64");
    });
  } catch (e) {
    console.error("Hero/overlay image failed", e?.message);
    return response(502, {
      error: "bedrock_image_failed",
      message: e?.message || "unknown",
    });
  }

  const bucket = (process.env.ASSETS_BUCKET || "").trim();
  const s3 = bucket ? new S3Client({}) : null;
  const batchId = randomUUID();

  const byDesign = designs.map(() => []);
  for (let j = 0; j < jobs.length; j++) {
    const { di, pi } = jobs[j];
    const pngBytes = Buffer.from(flatB64[j], "base64");
    if (s3) {
      const key = `ads/generated/${batchId}/design-${di + 1}-slide-${pi + 1}.png`;
      try {
        const url = await putPngPresignedGet(s3, bucket, key, pngBytes);
        byDesign[di].push({
          contentType: "image/png",
          url,
          s3Key: key,
        });
      } catch (e) {
        console.error("S3 upload failed", e?.message);
        return response(502, { error: "s3_upload_failed", message: e?.message || "unknown" });
      }
    } else {
      byDesign[di].push({ contentType: "image/png", data: flatB64[j] });
    }
  }

  const outputDesigns = designs.map((d, di) => ({
    style: d.style,
    caption: d.caption,
    hashtags: d.hashtags,
    images: byDesign[di],
  }));

  return response(200, {
    designs: outputDesigns,
    meta: {
      imageModel,
      textModel,
      imageBackend: useStabilityBackend(imageModel) ? "stability_sd3_style" : "nova_canvas",
      maxImagesPerPost: MAX_IMAGES_PER_POST,
      designCount: NUM_DESIGNS,
      imagePixelSize: useStabilityBackend(imageModel) ? null : novaPixelSize(),
      imageAspectRatio: useStabilityBackend(imageModel)
        ? (process.env.AD_IMAGE_ASPECT_RATIO || "4:5").trim()
        : null,
      novaQuality: useStabilityBackend(imageModel) ? null : novaQuality(),
      overlayEnabled: overlayEnabled(),
      overlayRenderer: overlayEnabled() ? `satori+resvg (${overlayRendererName()})` : "off",
      logoImageIndex: (process.env.AD_LOGO_IMAGE_INDEX || "-1").trim(),
      maxSlidesPerDesign: maxSlidesCap(),
      assetsBucket: bucket || null,
      delivery: bucket ? "s3_presigned_url" : "inline_base64",
      batchId,
    },
  });
};
