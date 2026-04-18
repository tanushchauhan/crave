/**
 * CRAVE — API Gateway HTTP API → Bedrock + Supabase Edge fan-out (docs/aws.md §6.2, §8.2).
 *
 * Env:
 * - PLACE_ORDER_URL — full URL: https://<ref>.supabase.co/functions/v1/place-order
 * - SUPABASE_ANON_KEY — publishable key (apikey header for Edge invoke)
 * - BEDROCK_TEXT_MODEL_ID (optional) — when /bedrock/converse is wired
 */

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type,apikey",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

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
    return {};
  }
}

function response(statusCode, bodyObj, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "content-type": "application/json", ...cors, ...extraHeaders },
    body: JSON.stringify(bodyObj),
  };
}

export const handler = async (event) => {
  const method =
    event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
  const path = event.rawPath ?? event.path ?? "";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (method !== "POST") {
    return response(405, { error: "method_not_allowed" });
  }

  const auth = getHeader(event.headers, "authorization");

  if (path.endsWith("/voice/place-order") || path === "/voice/place-order") {
    const url = process.env.PLACE_ORDER_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return response(500, { error: "missing_place_order_env" });
    }
    let forwardBody = "{}";
    if (typeof event.body === "string") {
      forwardBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body || "{}";
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth ?? "",
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: forwardBody,
    });
    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json", ...cors },
      body: text,
    };
  }

  if (path.endsWith("/bedrock/converse") || path.includes("bedrock/converse")) {
    const modelId = process.env.BEDROCK_TEXT_MODEL_ID;
    if (!modelId) {
      return response(501, {
        error: "bedrock_not_configured",
        message: "Set BEDROCK_TEXT_MODEL_ID to enable /bedrock/converse (docs/aws.md §6.2).",
      });
    }
    if (!auth) {
      return response(401, { error: "missing_authorization" });
    }

    const body = parseBody(event);
    const messages = body.messages;
    if (!Array.isArray(messages)) {
      return response(400, { error: "messages_array_required" });
    }

    const client = new BedrockRuntimeClient({});
    const out = await client.send(
      new ConverseCommand({
        modelId,
        messages,
        inferenceConfig: body.inferenceConfig ?? { maxTokens: 1024, temperature: 0 },
      }),
    );

    return response(200, { output: out.output, stopReason: out.stopReason, usage: out.usage });
  }

  if (path.endsWith("/voice/resolve-group") || path.endsWith("/voice/recommend")) {
    return response(501, {
      error: "not_implemented",
      message: "Point API Gateway to Supabase Edge resolve-group / recommend or extend this Lambda (docs/aws.md §8.2).",
      path,
    });
  }

  return response(404, { error: "not_found", path });
};
