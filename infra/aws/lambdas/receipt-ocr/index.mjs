/**
 * CRAVE — S3 → Bedrock vision → Supabase `receipt_captures` + `receipt_line_items`
 * Contract: docs/supabase.md §4 (`ReceiptParse`). See docs/aws.md §6.1.
 *
 * Env:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - RECEIPTS_BUCKET (optional; defaults from event)
 * - RECEIPT_PARSE_MODEL_ID (Bedrock model id) — required when USE_STUB != true
 * - MATCH_RECEIPT_EDGE_URL (optional Supabase Edge function URL)
 * - INTERNAL_HMAC_SECRET (docs/aws.md §6.1) — same value as Edge `CRAVE_INTERNAL_SECRET` for match-receipt-items
 * - CRAVE_INTERNAL_SECRET — legacy alias for INTERNAL_HMAC_SECRET
 * - USE_STUB=true — skips Bedrock, writes a canonical demo ReceiptParse
 */

import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const s3 = new S3Client({});
const bedrock = new BedrockRuntimeClient({});

function dollarsToCents(value) {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function parseReceiptKey(key) {
  const parts = key.split("/");
  if (parts.length < 3 || parts[0] !== "receipts") return null;
  const userId = parts[1];
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(userId)) return null;
  const file = parts[2] ?? "";
  const bookingSegment = file.replace(/\.(jpg|jpeg|png|webp)$/i, "");
  const bookingId = uuidRe.test(bookingSegment) ? bookingSegment : null;
  return { userId, bookingId };
}

async function streamToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function stubReceiptParse() {
  return {
    schema_version: 1,
    merchant_name: "Demo Merchant (stub)",
    currency: "USD",
    subtotal: "18.00",
    tax: "1.48",
    total: "19.48",
    line_items: [
      {
        description: "Margherita Pizza",
        quantity: 1,
        unit_price: "14.00",
        line_total: "14.00",
      },
      {
        description: "House Salad",
        quantity: 1,
        unit_price: "4.00",
        line_total: "4.00",
      },
    ],
    confidence_notes: "USE_STUB=true",
  };
}

function validateReceiptParse(j) {
  if (!j || typeof j !== "object") return false;
  if (j.schema_version !== 1) return false;
  if (typeof j.merchant_name !== "string") return false;
  if (!Array.isArray(j.line_items)) return false;
  for (const li of j.line_items) {
    if (!li || typeof li.description !== "string") return false;
  }
  return true;
}

async function callBedrockVision({ modelId, bytes, contentType, promptSuffix = "" }) {
  const prompt =
    "You are a receipt OCR engine. Return ONLY JSON matching this TypeScript-like shape: " +
    "{ schema_version: 1, merchant_name: string, currency: 'USD', subtotal: string, tax: string, total: string, " +
    "line_items: Array<{ description: string, quantity: number, unit_price: string, line_total: string }>, " +
    "confidence_notes: string | null }. " +
    "Monetary fields are decimal strings in major currency units." +
    promptSuffix;

  const input = {
    modelId,
    messages: [
      {
        role: "user",
        content: [
          { text: prompt },
          {
            image: {
              format: contentType.includes("png") ? "png" : "jpeg",
              source: { bytes: new Uint8Array(bytes) },
            },
          },
        ],
      },
    ],
    inferenceConfig: { maxTokens: 1024, temperature: 0 },
  };

  const res = await bedrock.send(new ConverseCommand(input));
  const text = res.output?.message?.content?.map((c) => c.text).filter(Boolean).join("\n") ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(text.slice(start, end + 1));
}

/** docs/aws.md §10.2 — one retry with stricter instruction (plan.md §10). */
async function bedrockVisionWithRetry({ modelId, bytes, contentType }) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const suffix =
        attempt === 0
          ? ""
          : " Your previous reply was not valid JSON or failed validation. Reply with ONLY one JSON object — no markdown fences, no commentary.";
      const json = await callBedrockVision({
        modelId,
        bytes,
        contentType,
        promptSuffix: suffix,
      });
      if (validateReceiptParse(json)) return json;
      lastErr = new Error("ReceiptParse validation failed");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function supabaseInsertCapture({ url, key, row }) {
  const res = await fetch(`${url}/rest/v1/receipt_captures`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`receipt_captures insert failed: ${res.status} ${bodyText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabaseInsertLines({ url, key, lines }) {
  if (!lines.length) return;
  const res = await fetch(`${url}/rest/v1/receipt_line_items?columns=receipt_id,raw_text,raw_price_cents,quantity`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lines),
  });
  if (!res.ok) {
    const bodyText = await res.text();
    throw new Error(`receipt_line_items insert failed: ${res.status} ${bodyText}`);
  }
}

async function invokeMatcher({ receiptId, s3Etag }) {
  const edgeUrl = process.env.MATCH_RECEIPT_EDGE_URL;
  const secret = process.env.INTERNAL_HMAC_SECRET || process.env.CRAVE_INTERNAL_SECRET;
  if (!edgeUrl || !secret) return;

  const payload = { receipt_id: receiptId };
  if (s3Etag) payload.s3_etag = s3Etag;

  await fetch(edgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-crave-internal-secret": secret,
    },
    body: JSON.stringify(payload),
  });
}

export const handler = async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  for (const record of event.Records ?? []) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const parsed = parseReceiptKey(key);
    if (!parsed) {
      console.warn("Skipping non-receipt key", key);
      continue;
    }

    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const etag = head.ETag ? head.ETag.replace(/"/g, "") : null;

    if (etag) {
      const dup = await fetch(
        `${supabaseUrl}/rest/v1/receipt_captures?s3_etag=eq.${encodeURIComponent(etag)}&select=id`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
      );
      if (dup.ok) {
        const rows = await dup.json();
        if (Array.isArray(rows) && rows.length > 0) {
          console.log("Idempotent skip for etag", etag);
          continue;
        }
      }
    }

    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await streamToBuffer(obj.Body);
    const contentType = obj.ContentType || "image/jpeg";

    let receiptJson;
    if (process.env.USE_STUB === "true" || !process.env.RECEIPT_PARSE_MODEL_ID) {
      receiptJson = stubReceiptParse();
    } else {
      receiptJson = await bedrockVisionWithRetry({
        modelId: process.env.RECEIPT_PARSE_MODEL_ID,
        bytes,
        contentType,
      });
    }

    const captureRow = {
      user_id: parsed.userId,
      booking_id: parsed.bookingId,
      image_s3_url: `s3://${bucket}/${key}`,
      ocr_raw: receiptJson,
      subtotal_cents: dollarsToCents(receiptJson.subtotal),
      tax_cents: dollarsToCents(receiptJson.tax),
      total_cents: dollarsToCents(receiptJson.total),
      status: "ocr_done",
      s3_etag: etag,
    };

    const inserted = await supabaseInsertCapture({ url: supabaseUrl, key: supabaseKey, row: captureRow });
    const receiptId = inserted.id;

    const lines = (receiptJson.line_items ?? []).map((li) => ({
      receipt_id: receiptId,
      raw_text: String(li.description ?? ""),
      raw_price_cents: dollarsToCents(li.line_total ?? li.unit_price) ?? 0,
      quantity: Number(li.quantity ?? 1),
    }));

    await supabaseInsertLines({ url: supabaseUrl, key: supabaseKey, lines: lines });

    await invokeMatcher({ receiptId, s3Etag: etag });
  }

  return { ok: true };
};
