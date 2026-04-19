import { NextResponse } from "next/server";
import { buildB2bRestaurantSystemPrompt } from "@/lib/b2b-chat/restaurant-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ClientMessage = { role: "user" | "assistant"; content: string };

function resolveB2bChatUrl(): string | null {
  const full = process.env.CRAVE_B2B_CHAT_URL?.trim();
  if (full) return full;
  const base = process.env.CRAVE_AWS_API_BASE?.trim().replace(/\/$/, "");
  if (!base) return null;
  return `${base}/b2b/chat`;
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
    if (typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role: role as ClientMessage["role"], content: trimmed });
  }
  return out.length ? out : null;
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

  const systemPrompt = buildB2bRestaurantSystemPrompt(restaurant, items ?? []);

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
