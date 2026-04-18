// CRAVE Edge: place-order (docs/supabase.md §11) — validates JWT + partner/menu rules, writes orders + order_items via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OrderLine = { menu_item_id: string; quantity?: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "missing_authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "invalid_jwt" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const uid = userData.user.id;

  let body: {
    restaurant_id?: string;
    items?: OrderLine[];
    voice_transcript_summary?: string | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.restaurant_id || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(
      JSON.stringify({ error: "restaurant_id_and_items_required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const admin = createClient(url, serviceKey);

  const { data: restaurant, error: rErr } = await admin
    .from("restaurants")
    .select("id, is_crave_partner")
    .eq("id", body.restaurant_id)
    .single();

  if (rErr || !restaurant?.is_crave_partner) {
    return new Response(JSON.stringify({ error: "restaurant_not_partner" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const menuIds = [...new Set(body.items.map((i) => i.menu_item_id))];
  const { data: menuRows, error: mErr } = await admin
    .from("menu_items")
    .select("id, restaurant_id, price_cents, is_available")
    .in("id", menuIds);

  if (mErr || !menuRows?.length) {
    return new Response(JSON.stringify({ error: "menu_lookup_failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const byId = new Map(menuRows.map((m) => [m.id, m]));
  let totalCents = 0;
  const orderItemRows: {
    menu_item_id: string;
    quantity: number;
    price_cents: number;
  }[] = [];

  for (const line of body.items) {
    const qty = Number(line.quantity ?? 1);
    if (!Number.isFinite(qty) || qty <= 0) {
      return new Response(JSON.stringify({ error: "invalid_quantity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mi = byId.get(line.menu_item_id);
    if (
      !mi ||
      mi.restaurant_id !== body.restaurant_id ||
      !mi.is_available
    ) {
      return new Response(
        JSON.stringify({
          error: "invalid_or_unavailable_menu_item",
          menu_item_id: line.menu_item_id,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    totalCents += Math.round(mi.price_cents * qty);
    orderItemRows.push({
      menu_item_id: mi.id,
      quantity: qty,
      price_cents: mi.price_cents,
    });
  }

  const { data: order, error: oErr } = await admin
    .from("orders")
    .insert({
      user_id: uid,
      restaurant_id: body.restaurant_id,
      total_cents: totalCents,
      voice_transcript_summary: body.voice_transcript_summary ?? null,
    })
    .select("id")
    .single();

  if (oErr || !order) {
    return new Response(JSON.stringify({ error: "order_insert_failed", detail: oErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = orderItemRows.map((r) => ({
    order_id: order.id,
    menu_item_id: r.menu_item_id,
    quantity: r.quantity,
    price_cents: r.price_cents,
  }));

  const { error: iErr } = await admin.from("order_items").insert(rows);

  if (iErr) {
    await admin.from("orders").delete().eq("id", order.id);
    return new Response(JSON.stringify({ error: "order_items_failed", detail: iErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      order_id: order.id,
      restaurant_id: body.restaurant_id,
      total_cents: totalCents,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
