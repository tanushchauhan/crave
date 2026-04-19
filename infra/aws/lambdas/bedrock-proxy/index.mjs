/**
 * CRAVE — API Gateway HTTP API → Bedrock + Supabase Edge fan-out (docs/aws.md §6.2, §8.2).
 *
 * Env:
 * - SUPABASE_ANON_KEY — publishable key (apikey header for Edge invoke)
 * - PLACE_ORDER_URL, RESOLVE_GROUP_URL, RECOMMEND_URL, CONFIRM_BOOKING_URL — full Edge URLs
 *   (deploy script defaults them from SUPABASE_URL when unset)
 * - BEDROCK_TEXT_MODEL_ID (optional) — when /bedrock/converse or /v1/chat/completions is wired
 * - ELEVENLABS_CUSTOM_LLM_SECRET (optional) — Bearer token for POST /v1/chat/completions (ElevenLabs Custom LLM)
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
    if (part && part.type === "text" && typeof part.text === "string") {
      blocks.push({ text: part.text });
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
    if (m.role === "system") {
      const c = m.content;
      systemParts.push(typeof c === "string" ? c : JSON.stringify(c ?? ""));
    } else {
      rest.push(m);
    }
  }
  if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
    return { error: "tools_not_supported", message: "Use client tools for CRAVE; OpenAI shim is text-only." };
  }
  if (body.stream === true) {
    return { error: "streaming_not_supported", message: "Set stream:false in ElevenLabs Custom LLM." };
  }
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

function mapOpenAiFinishReason(stopReason) {
  const r = String(stopReason || "").toLowerCase();
  if (r.includes("max_tokens")) return "length";
  if (r.includes("tool")) return "tool_calls";
  if (r.includes("guardrail") || r.includes("content_filter")) return "content_filter";
  return "stop";
}

function bedrockAssistantText(output) {
  const blocks = output?.message?.content;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b) => (b && typeof b.text === "string" ? b.text : ""))
    .join("");
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

  // ElevenLabs Custom LLM: OpenAI Chat Completions POST …/v1/chat/completions
  if (path.endsWith("/v1/chat/completions") || path.endsWith("/chat/completions")) {
    const modelId = process.env.BEDROCK_TEXT_MODEL_ID;
    const llmSecret = process.env.ELEVENLABS_CUSTOM_LLM_SECRET;
    if (!modelId) {
      return response(501, {
        error: "bedrock_not_configured",
        message: "Set BEDROCK_TEXT_MODEL_ID on crave-bedrock-proxy.",
      });
    }
    if (!llmSecret) {
      return response(503, {
        error: "elevenlabs_custom_llm_not_configured",
        message:
          "Set ELEVENLABS_CUSTOM_LLM_SECRET on crave-bedrock-proxy to the same Bearer token configured in ElevenLabs Custom LLM.",
      });
    }
    const token = bearerToken(auth);
    if (token !== llmSecret) {
      return response(401, { error: "invalid_api_key" });
    }

    const body = parseBody(event);
    const mapped = openAiMessagesToBedrock(body);
    if (mapped.error) {
      return response(400, mapped);
    }

    const maxTok =
      typeof body.max_tokens === "number"
        ? body.max_tokens
        : typeof body.max_completion_tokens === "number"
          ? body.max_completion_tokens
          : 1024;
    const temp =
      typeof body.temperature === "number" ? body.temperature : 0.3;

    const client = new BedrockRuntimeClient({});
    const cmd = new ConverseCommand({
      modelId,
      messages: mapped.messages,
      ...(mapped.system ? { system: mapped.system } : {}),
      inferenceConfig: {
        maxTokens: Math.min(Math.max(1, maxTok), 8192),
        temperature: Math.min(1, Math.max(0, temp)),
      },
    });

    let out;
    try {
      out = await client.send(cmd);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return response(502, { error: "bedrock_error", message: msg });
    }

    const text = bedrockAssistantText(out.output);
    const modelEcho =
      typeof body.model === "string" && body.model.length > 0
        ? body.model
        : modelId;
    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl-${created}-${Math.random().toString(36).slice(2, 12)}`;
    const u = out.usage || {};
    const promptTokens = u.inputTokens ?? 0;
    const completionTokens = u.outputTokens ?? 0;
    const totalTokens =
      u.totalTokens ?? promptTokens + completionTokens;

    return response(200, {
      id,
      object: "chat.completion",
      created,
      model: modelEcho,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: mapOpenAiFinishReason(out.stopReason),
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
    });
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
