/**
 * CRAVE — B2B dashboard multimodal chat → Bedrock Converse (Claude Sonnet 4).
 *
 * POST JSON (OpenAI-ish messages for easy client SDK mapping):
 * - messages: [{ role: "system"|"user"|"assistant", content: string | ContentPart[] }]
 * - max_tokens?, temperature?, top_p? (optional)
 *
 * content parts (user messages):
 * - { "type": "text", "text": "..." }
 * - { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
 * - { "type": "file", "file": { "filename": "x.pdf", "file_data": "<base64>" } }  (PDF only for MVP)
 *
 * Auth: Authorization: Bearer <B2B_CHAT_SECRET>
 *
 * Response: OpenAI-style chat.completion (non-streaming). Client keeps conversation history.
 */

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

const MAX_DOC_BYTES = 4_500_000;
const MAX_IMAGE_BYTES = 5_000_000;

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

function bearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return "";
  const m = authHeader.match(/^Bearer\s+(\S+)/i);
  return m ? m[1] : authHeader.trim();
}

/**
 * Parse data:image/...;base64,... including optional parameters (e.g. charset)
 * before the base64 payload. Strict /^data:[^;]+;base64,/ fails on
 * data:image/jpeg;charset=UTF-8;base64,... and breaks Bedrock image input.
 */
function decodeDataUrl(url) {
  if (typeof url !== "string") return null;
  const compact = url.replace(/\s/g, "");
  const marker = ";base64,";
  const mi = compact.toLowerCase().indexOf(marker);
  if (mi === -1) return null;
  const header = compact.slice(0, mi);
  const hm = header.match(/^data:(.+)$/i);
  if (!hm) return null;
  const mime = hm[1].split(";")[0].trim().toLowerCase();
  let b64 = compact.slice(mi + marker.length);
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  try {
    const buf = Buffer.from(b64, "base64");
    return { mime, bytes: buf };
  } catch {
    return null;
  }
}

function mimeToImageFormat(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  return null;
}

/**
 * OpenAI-style message.content → Bedrock Converse content blocks.
 */
function contentToBlocks(content) {
  if (content == null) return [{ text: "" }];
  if (typeof content === "string") return [{ text: content }];

  if (!Array.isArray(content)) {
    return [{ text: String(content) }];
  }

  const blocks = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;

    const t = part.type;
    if (t === "text" && typeof part.text === "string") {
      blocks.push({ text: part.text });
    }
    if (t === "input_text" && typeof part.text === "string") {
      blocks.push({ text: part.text });
    }

    if (t === "image_url" && part.image_url?.url) {
      const dec = decodeDataUrl(part.image_url.url);
      const fmt = dec ? mimeToImageFormat(dec.mime) : null;
      if (dec && fmt && dec.bytes.length <= MAX_IMAGE_BYTES) {
        blocks.push({ image: { format: fmt, source: { bytes: dec.bytes } } });
      } else {
        blocks.push({
          text: "[Image omitted: use a smaller data URL image/png or image/jpeg under ~5MB.]",
        });
      }
    }

    if (t === "input_image" && typeof part.image_url === "string") {
      const dec = decodeDataUrl(part.image_url);
      const fmt = dec ? mimeToImageFormat(dec.mime) : null;
      if (dec && fmt && dec.bytes.length <= MAX_IMAGE_BYTES) {
        blocks.push({ image: { format: fmt, source: { bytes: dec.bytes } } });
      } else {
        blocks.push({ text: "[Image omitted: invalid or too large.]" });
      }
    }

    if (t === "file" || t === "input_file") {
      const f = part.file || part;
      const name =
        typeof f.filename === "string"
          ? f.filename
          : typeof f.name === "string"
            ? f.name
            : "upload.pdf";
      const rawB64 =
        typeof f.file_data === "string"
          ? f.file_data
          : typeof f.data === "string"
            ? f.data
            : "";
      const b64 = rawB64.replace(/\s/g, "");
      let buf;
      try {
        buf = Buffer.from(b64, "base64");
      } catch {
        buf = null;
      }
      const lower = name.toLowerCase();
      const isPdf =
        lower.endsWith(".pdf") ||
        (typeof f.mime_type === "string" &&
          f.mime_type.toLowerCase().includes("pdf"));
      if (buf && isPdf && buf.length > 0 && buf.length <= MAX_DOC_BYTES) {
        const safeName =
          String(name)
            .replace(/[^\w.\-]+/g, "_")
            .replace(/_+/g, "_")
            .slice(0, 80) || "upload.pdf";
        blocks.push({
          document: {
            format: "pdf",
            name: safeName,
            source: { bytes: buf },
          },
        });
      } else if (buf && buf.length > MAX_DOC_BYTES) {
        blocks.push({
          text: "[PDF omitted: file too large for this endpoint (max ~4.5MB decoded).]",
        });
      } else {
        blocks.push({
          text: "[File omitted: send PDF as file.file_data base64 with .pdf filename.]",
        });
      }
    }
  }

  return blocks.length ? blocks : [{ text: "" }];
}

function openAiMessagesToConverse(body) {
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: "messages_required", message: "Provide a non-empty messages array." };
  }

  const systemParts = [];
  const bedrockMsgs = [];

  for (const m of messages) {
    if (!m || typeof m.role !== "string") continue;
    const role = m.role.toLowerCase();
    if (role === "system") {
      const c = m.content;
      systemParts.push(typeof c === "string" ? c : JSON.stringify(c ?? ""));
      continue;
    }
    if (role === "tool" || role === "function") {
      return {
        error: "tool_messages_not_supported",
        message: "Omit tool role messages; send user/assistant text only for this MVP.",
      };
    }

    const brRole = role === "assistant" ? "assistant" : "user";
    const blocks = contentToBlocks(m.content);
    const last = bedrockMsgs[bedrockMsgs.length - 1];
    if (last && last.role === brRole) {
      last.content.push(...blocks);
    } else {
      bedrockMsgs.push({ role: brRole, content: blocks });
    }
  }

  const system =
    systemParts.length > 0
      ? [{ text: systemParts.join("\n\n") }]
      : undefined;

  if (bedrockMsgs.length === 0) {
    return { error: "no_user_or_assistant_messages" };
  }
  if (bedrockMsgs[0].role !== "user") {
    bedrockMsgs.unshift({ role: "user", content: [{ text: "(Continue.)" }] });
  }

  return { system, messages: bedrockMsgs };
}

function assistantText(output) {
  const msg = output?.message;
  const blocks = msg?.content;
  if (!Array.isArray(blocks)) return "";
  const parts = [];
  for (const b of blocks) {
    if (b?.text) parts.push(b.text);
    const rt = b?.reasoningContent?.reasoningText?.text;
    if (typeof rt === "string") parts.push(rt);
  }
  return parts.join("") || "";
}

function mapStopReason(stopReason) {
  const r = String(stopReason || "").toLowerCase();
  if (r.includes("max_tokens")) return "length";
  return "stop";
}

export const handler = async (event) => {
  const method =
    event.requestContext?.http?.method ?? event.httpMethod ?? "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (method !== "POST") {
    return response(405, { error: "method_not_allowed" });
  }

  const secret = process.env.B2B_CHAT_SECRET;
  if (!secret) {
    return response(503, {
      error: "b2b_chat_misconfigured",
      message: "Set B2B_CHAT_SECRET on crave-b2b-chat.",
    });
  }

  const token = bearerToken(getHeader(event.headers, "authorization"));
  if (token !== secret) {
    return response(401, { error: "invalid_api_key" });
  }

  const modelId =
    process.env.B2B_CHAT_MODEL_ID ||
    "us.anthropic.claude-sonnet-4-20250514-v1:0";

  const body = parseBody(event);
  if (!body) {
    return response(400, { error: "invalid_json" });
  }

  const mapped = openAiMessagesToConverse(body);
  if (mapped.error) {
    return response(400, mapped);
  }

  const maxTok =
    typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens)
      ? body.max_tokens
      : 4096;
  const maxOut = maxTok <= 0 ? 8192 : Math.min(Math.max(1, Math.round(maxTok)), 8192);
  const temp =
    typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? body.temperature
      : 0.3;
  const topP =
    typeof body.top_p === "number" && Number.isFinite(body.top_p)
      ? body.top_p
      : undefined;

  const client = new BedrockRuntimeClient({});
  let out;
  try {
    out = await client.send(
      new ConverseCommand({
        modelId,
        messages: mapped.messages,
        ...(mapped.system ? { system: mapped.system } : {}),
        inferenceConfig: {
          maxTokens: maxOut,
          temperature: Math.min(1, Math.max(0, temp)),
          ...(topP != null
            ? { topP: Math.min(1, Math.max(0, topP)) }
            : {}),
        },
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return response(502, { error: "bedrock_error", message: msg });
  }

  const text = assistantText(out.output);
  const created = Math.floor(Date.now() / 1000);
  const id = `chatcmpl-b2b-${created}-${Math.random().toString(36).slice(2, 10)}`;
  const u = out.usage || {};
  const pt = u.inputTokens ?? 0;
  const ct = u.outputTokens ?? 0;
  const usage = {
    prompt_tokens: pt,
    completion_tokens: ct,
    total_tokens: u.totalTokens ?? pt + ct,
  };

  return response(200, {
    id,
    object: "chat.completion",
    created,
    model: typeof body.model === "string" && body.model.trim() ? body.model.trim() : modelId,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: mapStopReason(out.stopReason),
      },
    ],
    usage,
  });
};
