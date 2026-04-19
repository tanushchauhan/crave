import { NextResponse } from "next/server";
import { buildB2bRestaurantSystemPrompt } from "@/lib/b2b-chat/restaurant-context";
import type { UserContentPart } from "@/lib/b2b-chat/multipart-messages";
import {
  isAllowedImageDataUrl,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  normalizeImageDataUrl,
  sanitizeBedrockPdfDocumentName,
} from "@/lib/b2b-chat/multipart-messages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ClientMessage = { role: "user" | "assistant"; content: string | UserContentPart[] };

function resolveB2bChatUrl(): string | null {
  const full = process.env.CRAVE_B2B_CHAT_URL?.trim();
  if (full) return full;
  const base = process.env.CRAVE_AWS_API_BASE?.trim().replace(/\/$/, "");
  if (!base) return null;
  return `${base}/b2b/chat`;
}

function sanitizeUserContent(content: unknown): string | UserContentPart[] | null {
  if (typeof content === "string") {
    const t = content.trim();
    return t.length ? t : null;
  }
  if (!Array.isArray(content)) return null;
  const parts: UserContentPart[] = [];
  for (const p of content) {
    if (!p || typeof p !== "object") continue;
    const typ = (p as { type?: unknown }).type;
    if (typ === "text" && typeof (p as { text?: unknown }).text === "string") {
      const tx = (p as { text: string }).text.trim();
      if (tx) parts.push({ type: "text", text: tx });
    } else if (typ === "image_url") {
      const url = (p as { image_url?: { url?: unknown } }).image_url?.url;
      if (typeof url !== "string") continue;
      const normalized = normalizeImageDataUrl(url);
      if (!isAllowedImageDataUrl(normalized)) continue;
      const approx = Math.floor((normalized.length * 3) / 4);
      if (approx <= MAX_IMAGE_BYTES) {
        parts.push({ type: "image_url", image_url: { url: normalized } });
      }
    } else if (typ === "file") {
      const f = (p as { file?: unknown }).file;
      if (f && typeof f === "object") {
        const fn = (f as { filename?: unknown }).filename;
        const fd = (f as { file_data?: unknown }).file_data;
        if (typeof fn === "string" && typeof fd === "string") {
          const raw = fd.replace(/\s/g, "");
          const approx = Math.floor((raw.length * 3) / 4);
          if (approx <= 0 || approx > MAX_PDF_BYTES) continue;
          const nameLooksPdf = fn.toLowerCase().endsWith(".pdf");
          let bytesLookPdf = false;
          try {
            const head = Buffer.from(raw.slice(0, 32), "base64");
            bytesLookPdf =
              head.length >= 4 &&
              head[0] === 0x25 &&
              head[1] === 0x50 &&
              head[2] === 0x44 &&
              head[3] === 0x46;
          } catch {
            bytesLookPdf = false;
          }
          if (!nameLooksPdf && !bytesLookPdf) continue;
          parts.push({
            type: "file",
            file: {
              filename: sanitizeBedrockPdfDocumentName(fn),
              file_data: raw,
            },
          });
        }
      }
    }
  }
  return parts.length ? parts : null;
}

function sanitizeClientMessages(raw: unknown): ClientMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ClientMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const roleRaw = (m as { role?: unknown }).role;
    const role = typeof roleRaw === "string" ? roleRaw.toLowerCase() : "";
    if (role !== "user" && role !== "assistant") continue;
    const content = (m as { content?: unknown }).content;
    if (role === "assistant") {
      if (typeof content !== "string") continue;
      const trimmed = content.trim();
      if (!trimmed) continue;
      out.push({ role: "assistant", content: trimmed });
      continue;
    }
    const userC = sanitizeUserContent(content);
    if (userC === null) continue;
    out.push({ role: "user", content: userC });
  }
  return out.length ? out : null;
}

function messagesHaveUserAttachments(msgs: ClientMessage[]): boolean {
  for (const m of msgs) {
    if (m.role !== "user") continue;
    if (typeof m.content === "string") continue;
    for (const part of m.content) {
      if (part.type === "image_url" || part.type === "file") return true;
    }
  }
  return false;
}

export async function POST(req: Request) {
  const secret = process.env.B2B_CHAT_SECRET;
  const url = resolveB2bChatUrl();
  if (!secret || !url) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientMessages = sanitizeClientMessages(body.messages);
  if (!clientMessages) {
    return NextResponse.json(
      { error: "messages_required", message: "Send a non-empty messages array of user/assistant turns." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: restaurants, error: rErr } = await supabase
    .from("restaurants")
    .select("id, name, cuisine_tags")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  const restaurant = restaurants?.[0];
  if (!restaurant) {
    return NextResponse.json({ error: "no_restaurant" }, { status: 404 });
  }

  const { data: items, error: iErr } = await supabase
    .from("menu_items")
    .select("name, description, price_cents, is_available, metadata")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  const compactMenu = messagesHaveUserAttachments(clientMessages);
  const systemPrompt = buildB2bRestaurantSystemPrompt(restaurant, items ?? [], {
    ...(compactMenu
      ? { maxMenuItems: 48, maxDescChars: 140 }
      : {}),
  });

  const upstreamPayload: Record<string, unknown> = {
    messages: [{ role: "system", content: systemPrompt }, ...clientMessages],
  };

  if (typeof body.temperature === "number" && Number.isFinite(body.temperature)) {
    upstreamPayload.temperature = body.temperature;
  }
  if (typeof body.top_p === "number" && Number.isFinite(body.top_p)) {
    upstreamPayload.top_p = body.top_p;
  }
  if (typeof body.model === "string" && body.model.trim()) {
    upstreamPayload.model = body.model.trim();
  }
  if (typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens)) {
    upstreamPayload.max_tokens = Math.min(8192, Math.max(1, Math.round(body.max_tokens)));
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamPayload),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
