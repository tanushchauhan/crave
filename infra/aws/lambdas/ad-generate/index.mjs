/**
 * CRAVE — POST /ads/generate → Bedrock image → S3 (docs/aws.md §6.3).
 *
 * Env (full implementation):
 * - ASSETS_BUCKET
 * - AD_IMAGE_MODEL_ID (Bedrock image model id)
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (optional: persist ad_assets from Lambda)
 *
 * Hackathon stub: returns structured TODO so API Gateway + curl checks pass (docs/aws.md §13).
 */

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

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

export const handler = async (event) => {
  const method =
    event.requestContext?.http?.method ?? event.httpMethod ?? "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (method !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json", ...cors },
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  const auth = getHeader(event.headers, "authorization");
  if (!auth) {
    return {
      statusCode: 401,
      headers: { "content-type": "application/json", ...cors },
      body: JSON.stringify({ error: "missing_authorization" }),
    };
  }

  const body = parseBody(event);

  return {
    statusCode: 501,
    headers: { "content-type": "application/json", ...cors },
    body: JSON.stringify({
      error: "stub",
      message:
        "Implement Bedrock image model invoke, PutObject to ASSETS_BUCKET under ads/{restaurant_id}/{campaign_id}/, return presigned GET or CloudFront URL (docs/aws.md §6.3, §9).",
      received: {
        prompt: body.prompt ?? null,
        restaurant_id: body.restaurant_id ?? null,
      },
    }),
  };
};
