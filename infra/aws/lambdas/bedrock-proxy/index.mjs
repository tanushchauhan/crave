/**
 * CRAVE — API Gateway HTTP API → Bedrock + Supabase Edge fan-out (docs/aws.md §6.2, §8.2).
 *
 * Env:
 * - SUPABASE_URL, SUPABASE_ANON_KEY — for POST /receipts/signed-url (auth/v1/user + bookings RLS check)
 * - RECEIPTS_BUCKET — receipts S3 bucket (deploy sets from CRAVE_RECEIPTS_BUCKET)
 * - PLACE_ORDER_URL, RESOLVE_GROUP_URL, RECOMMEND_URL, CONFIRM_BOOKING_URL — full Edge URLs
 *   (deploy script defaults them from SUPABASE_URL when unset)
 * - BEDROCK_TEXT_MODEL_ID (optional) — when /bedrock/converse or OpenAI shims are wired
 * - ELEVENLABS_CUSTOM_LLM_SECRET (optional) — Bearer for POST /v1/chat/completions and POST /v1/responses (ElevenLabs Custom LLM).
 *   OpenAI-style `tools` in the body are ignored (text-only Bedrock); ElevenLabs system tools still attach to requests.
 * - INTERNAL_HMAC_SECRET or CRAVE_INTERNAL_SECRET — for POST /internal/embeddings/text (x-crave-internal-secret; same as match-receipt-items / receipt-ocr).
 * - TITAN_EMBEDDING_MODEL_ID (optional) — default amazon.titan-embed-text-v1 (1536-d).
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization,content-type,apikey,x-crave-internal-secret",
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

/** OpenAI/ElevenLabs use `max_tokens` / `max_output_tokens` of `-1` or `0` for "no limit"; Bedrock needs a positive cap. */
function toBedrockMaxTokens(preferred, unsetDefault = 1024) {
  const n =
    typeof preferred === "number" && Number.isFinite(preferred)
      ? preferred
      : unsetDefault;
  if (n <= 0) return 8192;
  return Math.min(Math.max(1, Math.round(n)), 8192);
}

function response(statusCode, bodyObj, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "content-type": "application/json", ...cors, ...extraHeaders },
    body: JSON.stringify(bodyObj),
  };
}

/** ElevenLabs Custom LLM requires SSE (text/event-stream), not a single JSON body. */
function responseSse(sseBody, statusCode = 200, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      ...cors,
      ...extraHeaders,
    },
    body: sseBody,
  };
}

/** OpenAI-style streamed error; ElevenLabs often expects 200 + SSE, not JSON 502. */
function sseOpenAiErrorPayload(message, code = "bedrock_error") {
  return `data: ${JSON.stringify({
    error: { message, type: "api_error", code, param: null },
  })}\n\ndata: [DONE]\n\n`;
}

function rawBodyFromEvent(event) {
  if (typeof event.body !== "string") return "{}";
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body || "{}";
}

/** Bearer value from Authorization (OpenAI-style). */
function bearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return "";
  const m = authHeader.match(/^Bearer\s+(\S+)/i);
  return m ? m[1] : authHeader.trim();
}

/** OpenAI message.content → Bedrock Converse content blocks (text only for MVP). */
function openAiContentToBedrockBlocks(content) {
  if (content == null) return [{ text: "" }];
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content) }];
  const blocks = [];
  for (const part of content) {
    if (!part) continue;
    if (part.type === "text" && typeof part.text === "string") {
      blocks.push({ text: part.text });
    }
    if (part.type === "input_text" && typeof part.text === "string") {
      blocks.push({ text: part.text });
    }
    if (part.type === "image_url" || part.type === "input_image") {
      blocks.push({ text: "[User attached an image; describe or ask without relying on pixels here.]" });
    }
  }
  return blocks.length ? blocks : [{ text: "" }];
}

/** Split system vs other roles; ElevenLabs / OpenAI use role "system". */
function openAiMessagesToBedrock(body) {
  const messages = body.messages;
  if (!Array.isArray(messages)) {
    return { error: "messages_array_required" };
  }
  const systemParts = [];
  const rest = [];
  for (const m of messages) {
    if (!m || typeof m.role !== "string") continue;
    if (m.role === "system" || m.role === "developer") {
      const c = m.content;
      systemParts.push(typeof c === "string" ? c : JSON.stringify(c ?? ""));
    } else {
      rest.push(m);
    }
  }
  // ElevenLabs sends OpenAI-style `tools` (end_call, language_detection, …). Bedrock shim is text-only;
  // ignore tools so the turn still gets a text completion instead of failing the whole agent.
  const system =
    systemParts.length > 0 ? [{ text: systemParts.join("\n\n") }] : undefined;

  const bedrockMsgs = [];
  for (const m of rest) {
    const role = m.role === "assistant" ? "assistant" : "user";
    if (m.role === "tool" || m.role === "function") {
      return {
        error: "tool_role_not_supported",
        message: "OpenAI shim does not replay tool messages; use /bedrock/converse with native Bedrock messages.",
      };
    }
    const blocks = openAiContentToBedrockBlocks(m.content);
    const last = bedrockMsgs[bedrockMsgs.length - 1];
    if (last && last.role === role) {
      last.content.push(...blocks);
    } else {
      bedrockMsgs.push({ role, content: blocks });
    }
  }
  if (bedrockMsgs.length === 0) {
    return { error: "no_conversation_messages" };
  }
  if (bedrockMsgs[0].role !== "user") {
    bedrockMsgs.unshift({ role: "user", content: [{ text: "(Continue.)" }] });
  }
  return { system, messages: bedrockMsgs };
}

/** OpenAI Responses API `input` + `instructions` → Bedrock Converse (text-only). */
function responsesInputToBedrock(body) {
  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  let input = body.input;
  if (typeof input === "string") {
    input = [{ role: "user", content: input }];
  }
  if (!Array.isArray(input)) {
    return { error: "input_required", message: "input must be a string or array of messages." };
  }
  const systemParts = [];
  if (instructions) systemParts.push(instructions);
  const rest = [];
  for (const m of input) {
    if (!m || typeof m.role !== "string") continue;
    if (m.role === "system" || m.role === "developer") {
      const c = m.content;
      systemParts.push(typeof c === "string" ? c : JSON.stringify(c ?? ""));
    } else {
      rest.push(m);
    }
  }
  const system =
    systemParts.length > 0 ? [{ text: systemParts.join("\n\n") }] : undefined;
  const bedrockMsgs = [];
  for (const m of rest) {
    const role = m.role === "assistant" ? "assistant" : "user";
    if (m.role === "tool" || m.role === "function") {
      return { error: "tool_role_not_supported", message: "Unsupported role in input." };
    }
    const blocks = openAiContentToBedrockBlocks(m.content);
    const last = bedrockMsgs[bedrockMsgs.length - 1];
    if (last && last.role === role) {
      last.content.push(...blocks);
    } else {
      bedrockMsgs.push({ role, content: blocks });
    }
  }
  if (bedrockMsgs.length === 0) {
    return { error: "no_conversation_messages" };
  }
  if (bedrockMsgs[0].role !== "user") {
    bedrockMsgs.unshift({ role: "user", content: [{ text: "(Continue.)" }] });
  }
  return { system, messages: bedrockMsgs };
}

function mapOpenAiFinishReason(stopReason) {
  const r = String(stopReason || "").toLowerCase();
  if (r.includes("max_tokens")) return "length";
  if (r.includes("tool")) return "tool_calls";
  if (r.includes("guardrail") || r.includes("content_filter")) return "content_filter";
  return "stop";
}

function bedrockAssistantText(output) {
  const msg = output?.message;
  const blocks = msg?.content;
  if (!Array.isArray(blocks)) return "";
  const parts = [];
  for (const b of blocks) {
    if (!b) continue;
    if (typeof b.text === "string") parts.push(b.text);
    const rt = b.reasoningContent?.reasoningText?.text;
    if (typeof rt === "string") parts.push(rt);
    if (b.toolUse?.name) {
      parts.push(`[tool:${b.toolUse.name}]`);
    }
  }
  const s = parts.join("");
  return typeof s === "string" ? s : "";
}

/**
 * OpenAI-compatible SSE for chat.completions (ElevenLabs parses chunks like OpenAI SDK model_dump()).
 * Include logprobs:null on choices; do not attach usage to chunks (OpenAI only adds it with stream_options).
 */
function sseOpenAiChatCompletion({
  id,
  created,
  model,
  modelFallback,
  text,
  finishReason,
}) {
  const safeModel =
    (model && String(model).trim()) ||
    (modelFallback && String(modelFallback).trim()) ||
    "gpt-4";
  const base = {
    id,
    object: "chat.completion.chunk",
    created,
    model: safeModel,
  };
  const choice = (delta, finish_reason) => ({
    index: 0,
    delta,
    logprobs: null,
    finish_reason,
  });
  const outText =
    text == null || String(text).length === 0
      ? " "
      : String(text);
  const lines = [];
  lines.push(
    `data: ${JSON.stringify({
      ...base,
      choices: [choice({ role: "assistant" }, null)],
    })}\n\n`,
  );
  lines.push(
    `data: ${JSON.stringify({
      ...base,
      choices: [choice({ content: outText }, null)],
    })}\n\n`,
  );
  lines.push(
    `data: ${JSON.stringify({
      ...base,
      choices: [choice({}, finishReason || "stop")],
    })}\n\n`,
  );
  lines.push("data: [DONE]\n\n");
  return lines.join("");
}

/**
 * OpenAI Responses API SSE — format required by ElevenLabs Custom LLM when using Responses.
 * @see https://elevenlabs.io/docs/conversational-ai/customization/custom-llm
 */
function sseResponsesApiStream({ responseId, text }) {
  // ElevenLabs docs: minimum events are `response.output_text.delta` + `response.completed` only
  // (https://elevenlabs.io/docs/conversational-ai/customization/custom-llm — Responses API).
  const delta =
    text == null || String(text).length === 0 ? " " : String(text);
  const lines = [];
  lines.push(
    `event: response.output_text.delta\ndata: ${JSON.stringify({
      type: "response.output_text.delta",
      delta,
    })}\n\n`,
  );
  lines.push(
    `event: response.completed\ndata: ${JSON.stringify({
      type: "response.completed",
      response: { id: responseId, status: "completed" },
    })}\n\n`,
  );
  lines.push("data: [DONE]\n\n");
  return lines.join("");
}

function sseResponsesApiError(message, code = "bedrock_error") {
  return `event: error\ndata: ${JSON.stringify({
    type: "error",
    error: { message, code },
  })}\n\ndata: [DONE]\n\n`;
}

/** Shared gate for ElevenLabs → Bedrock shims. */
function checkElevenLabsCustomLlmAuth(authHeader) {
  const modelId = process.env.BEDROCK_TEXT_MODEL_ID;
  if (!modelId) {
    return {
      error: response(501, {
        error: "bedrock_not_configured",
        message: "Set BEDROCK_TEXT_MODEL_ID on crave-bedrock-proxy.",
      }),
    };
  }
  const llmSecret = process.env.ELEVENLABS_CUSTOM_LLM_SECRET;
  if (!llmSecret) {
    return {
      error: response(503, {
        error: "elevenlabs_custom_llm_not_configured",
        message:
          "Set ELEVENLABS_CUSTOM_LLM_SECRET on crave-bedrock-proxy to match ElevenLabs Custom LLM API key.",
      }),
    };
  }
  const token = bearerToken(authHeader);
  if (token !== llmSecret) {
    return { error: response(401, { error: "invalid_api_key" }) };
  }
  return { modelId };
}

async function forwardToSupabaseEdge(targetUrl, anonKey, authHeader, event) {
  const upstream = await fetch(targetUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader ?? "",
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: rawBodyFromEvent(event),
  });
  const text = await upstream.text();
  return {
    statusCode: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      ...cors,
    },
    body: text,
  };
}

/**
 * POST /receipts/signed-url — presigned S3 PUT for `receipts/{user_id}/{booking_id}.{ext}` (matches crave-receipt-ocr key parser).
 * Body: { booking_id: uuid, content_type?: "image/jpeg"|"image/png"|"image/webp", include_get_url?: boolean, expires_in?: number (60–3600) }
 */
async function handleReceiptsSignedUrl(event) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = process.env.SUPABASE_ANON_KEY;
  const receiptsBucket = process.env.RECEIPTS_BUCKET;
  if (!supabaseUrl || !anon) {
    return response(500, { error: "missing_supabase_config" });
  }
  if (!receiptsBucket) {
    return response(503, {
      error: "receipts_bucket_not_configured",
      message:
        "Set RECEIPTS_BUCKET on crave-bedrock-proxy (deploy injects CRAVE_RECEIPTS_BUCKET from bootstrap).",
    });
  }

  const authHeader = getHeader(event.headers, "authorization");
  if (!authHeader) {
    return response(401, { error: "missing_authorization" });
  }

  const body = parseBody(event);
  const bookingId =
    typeof body.booking_id === "string" ? body.booking_id.trim() : "";
  if (!UUID_RE.test(bookingId)) {
    return response(400, { error: "invalid_booking_id" });
  }

  const rawCt =
    typeof body.content_type === "string"
      ? body.content_type.trim().toLowerCase()
      : "image/jpeg";
  const ctToExt = new Map([
    ["image/jpeg", "jpg"],
    ["image/jpg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  if (!ctToExt.has(rawCt)) {
    return response(400, {
      error: "invalid_content_type",
      allowed: ["image/jpeg", "image/png", "image/webp"],
    });
  }
  const ext = ctToExt.get(rawCt);
  const contentType = rawCt === "image/jpg" ? "image/jpeg" : rawCt;

  let expiresIn = Number(body.expires_in);
  if (!Number.isFinite(expiresIn)) expiresIn = 900;
  expiresIn = Math.min(3600, Math.max(60, Math.round(expiresIn)));

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anon },
  });
  if (userRes.status === 401 || userRes.status === 403) {
    return response(401, { error: "invalid_session" });
  }
  if (!userRes.ok) {
    return response(502, {
      error: "auth_lookup_failed",
      status: userRes.status,
    });
  }
  const sessionUser = await userRes.json();
  const userId = sessionUser?.id;
  if (!userId || !UUID_RE.test(String(userId))) {
    return response(401, { error: "invalid_session" });
  }

  const bookingRes = await fetch(
    `${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id`,
    {
      headers: {
        Authorization: authHeader,
        apikey: anon,
        Accept: "application/json",
      },
    },
  );
  if (!bookingRes.ok) {
    const detail = (await bookingRes.text()).slice(0, 300);
    return response(502, { error: "booking_lookup_failed", detail });
  }
  const bookingRows = await bookingRes.json();
  if (!Array.isArray(bookingRows) || bookingRows.length === 0) {
    return response(403, {
      error: "forbidden",
      message: "Booking not found or no access.",
    });
  }

  const key = `receipts/${userId}/${bookingId}.${ext}`;
  const s3 = new S3Client({});
  const putCmd = new PutObjectCommand({
    Bucket: receiptsBucket,
    Key: key,
    ContentType: contentType,
  });
  const putUrl = await getSignedUrl(s3, putCmd, { expiresIn });

  const out = {
    put_url: putUrl,
    bucket: receiptsBucket,
    key,
    expires_in: expiresIn,
    headers: { "Content-Type": contentType },
  };

  if (body.include_get_url === true) {
    const getCmd = new GetObjectCommand({ Bucket: receiptsBucket, Key: key });
    out.get_url = await getSignedUrl(s3, getCmd, { expiresIn });
  }

  return response(200, out);
}

function checkInternalHmacSecret(event) {
  const expected = (
    process.env.INTERNAL_HMAC_SECRET ||
    process.env.CRAVE_INTERNAL_SECRET ||
    ""
  ).trim();
  if (!expected) {
    return { err: response(503, { error: "internal_hmac_not_configured" }) };
  }
  const provided = (getHeader(event.headers, "x-crave-internal-secret") || "").trim();
  if (provided !== expected) {
    return { err: response(403, { error: "forbidden" }) };
  }
  return {};
}

/** POST /internal/embeddings/text — Titan Text Embeddings G1 (1536); gated by x-crave-internal-secret. */
async function handleInternalEmbeddingsText(event) {
  const gate = checkInternalHmacSecret(event);
  if (gate.err) return gate.err;

  const body = parseBody(event);
  const text =
    typeof body.input === "string"
      ? body.input
      : typeof body.inputText === "string"
        ? body.inputText
        : "";
  if (!String(text).trim()) {
    return response(400, { error: "input_required" });
  }

  const modelId =
    (process.env.TITAN_EMBEDDING_MODEL_ID || "").trim() ||
    "amazon.titan-embed-text-v1";
  const client = new BedrockRuntimeClient({});
  const payload = JSON.stringify({
    inputText: String(text).slice(0, 8192),
  });

  try {
    const res = await client.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: Buffer.from(payload),
      }),
    );
    const raw = new TextDecoder().decode(res.body);
    const json = JSON.parse(raw);
    const embedding = json.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      return response(502, {
        error: "bedrock_bad_embedding_shape",
        length: Array.isArray(embedding) ? embedding.length : null,
      });
    }
    return response(200, { embedding, model_id: modelId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return response(502, { error: "bedrock_invoke_failed", message: msg });
  }
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

  if (path.endsWith("/receipts/signed-url") || path === "/receipts/signed-url") {
    return handleReceiptsSignedUrl(event);
  }

  if (
    path.endsWith("/internal/embeddings/text") ||
    path === "/internal/embeddings/text"
  ) {
    return handleInternalEmbeddingsText(event);
  }

  const anon = process.env.SUPABASE_ANON_KEY;
  const voiceRoutes = [
    ["/voice/place-order", process.env.PLACE_ORDER_URL],
    ["/voice/resolve-group", process.env.RESOLVE_GROUP_URL],
    ["/voice/recommend", process.env.RECOMMEND_URL],
    ["/voice/confirm-booking", process.env.CONFIRM_BOOKING_URL],
  ];

  for (const [suffix, edgeUrl] of voiceRoutes) {
    if (path.endsWith(suffix) || path === suffix) {
      if (!anon) {
        return response(500, { error: "missing_supabase_anon_key" });
      }
      if (!edgeUrl) {
        return response(500, { error: "missing_voice_edge_url", route: suffix });
      }
      if (!auth) {
        return response(401, { error: "missing_authorization" });
      }
      return forwardToSupabaseEdge(edgeUrl, anon, auth, event);
    }
  }

  // ElevenLabs Custom LLM: OpenAI Responses API POST …/v1/responses (SSE: response.output_text.delta + response.completed)
  if (path.endsWith("/v1/responses")) {
    const gate = checkElevenLabsCustomLlmAuth(auth);
    if (gate.error) return gate.error;
    const { modelId } = gate;

    const body = parseBody(event);
    const mapped = responsesInputToBedrock(body);
    if (mapped.error) {
      if (body.stream !== false) {
        return responseSse(
          sseResponsesApiError(
            mapped.message || mapped.error || "bad_request",
            String(mapped.error || "invalid_request_error"),
          ),
        );
      }
      return response(400, mapped);
    }

    const rawMaxTok =
      typeof body.max_output_tokens === "number"
        ? body.max_output_tokens
        : typeof body.max_tokens === "number"
          ? body.max_tokens
          : undefined;
    const maxTok = toBedrockMaxTokens(rawMaxTok, 1024);
    const temp =
      typeof body.temperature === "number" ? body.temperature : 0.3;

    const client = new BedrockRuntimeClient({});
    const cmd = new ConverseCommand({
      modelId,
      messages: mapped.messages,
      ...(mapped.system ? { system: mapped.system } : {}),
      inferenceConfig: {
        maxTokens: maxTok,
        temperature: Math.min(1, Math.max(0, temp)),
      },
    });

    let out;
    try {
      out = await client.send(cmd);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (body.stream !== false) {
        return responseSse(sseResponsesApiError(msg, "bedrock_error"));
      }
      return response(502, { error: "bedrock_error", message: msg });
    }

    const t = bedrockAssistantText(out.output);
    const modelEcho =
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : modelId;
    const created = Math.floor(Date.now() / 1000);
    const responseId = `resp_${created}_${Math.random().toString(36).slice(2, 10)}`;
    const u = out.usage || {};
    const usage = {
      input_tokens: u.inputTokens ?? 0,
      output_tokens: u.outputTokens ?? 0,
      total_tokens:
        u.totalTokens ?? (u.inputTokens ?? 0) + (u.outputTokens ?? 0),
    };

    if (body.stream === false) {
      return response(200, {
        id: responseId,
        object: "response",
        created_at: created,
        status: "completed",
        model: modelEcho,
        output: [
          {
            id: `msg_${Math.random().toString(36).slice(2, 12)}`,
            type: "message",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text: t }],
          },
        ],
        usage,
      });
    }

    return responseSse(sseResponsesApiStream({ responseId, text: t }));
  }

  // ElevenLabs Custom LLM: OpenAI Chat Completions POST …/v1/chat/completions
  if (path.endsWith("/v1/chat/completions") || path.endsWith("/chat/completions")) {
    const gate = checkElevenLabsCustomLlmAuth(auth);
    if (gate.error) return gate.error;
    const { modelId } = gate;

    const body = parseBody(event);
    const mapped = openAiMessagesToBedrock(body);
    if (mapped.error) {
      if (body.stream !== false) {
        return responseSse(
          sseOpenAiErrorPayload(
            mapped.message || mapped.error || "bad_request",
            String(mapped.error || "invalid_request_error"),
          ),
        );
      }
      return response(400, mapped);
    }

    const rawMaxTok =
      typeof body.max_tokens === "number"
        ? body.max_tokens
        : typeof body.max_completion_tokens === "number"
          ? body.max_completion_tokens
          : undefined;
    const maxTok = toBedrockMaxTokens(rawMaxTok, 1024);
    const temp =
      typeof body.temperature === "number" ? body.temperature : 0.3;

    const client = new BedrockRuntimeClient({});
    const cmd = new ConverseCommand({
      modelId,
      messages: mapped.messages,
      ...(mapped.system ? { system: mapped.system } : {}),
      inferenceConfig: {
        maxTokens: maxTok,
        temperature: Math.min(1, Math.max(0, temp)),
      },
    });

    let out;
    try {
      out = await client.send(cmd);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (body.stream !== false) {
        return responseSse(sseOpenAiErrorPayload(msg, "bedrock_error"));
      }
      return response(502, { error: "bedrock_error", message: msg });
    }

    const text = bedrockAssistantText(out.output);
    const modelEcho =
      typeof body.model === "string" && body.model.trim().length > 0
        ? body.model.trim()
        : modelId;
    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl-${created}-${Math.random().toString(36).slice(2, 12)}`;
    const u = out.usage || {};
    const promptTokens = u.inputTokens ?? 0;
    const completionTokens = u.outputTokens ?? 0;
    const totalTokens =
      u.totalTokens ?? promptTokens + completionTokens;
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    };
    const finishReason = mapOpenAiFinishReason(out.stopReason);

    // ElevenLabs Custom LLM: docs require SSE (text/event-stream), not application/json.
    if (body.stream === false) {
      return response(200, {
        id,
        object: "chat.completion",
        created,
        model: modelEcho,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            finish_reason: finishReason,
          },
        ],
        usage,
      });
    }

    return responseSse(
      sseOpenAiChatCompletion({
        id,
        created,
        model: modelEcho,
        modelFallback: modelId,
        text,
        finishReason,
      }),
    );
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

  return response(404, { error: "not_found", path });
};
