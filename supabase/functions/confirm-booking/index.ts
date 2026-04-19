// CRAVE Edge: confirm-booking — partner in-app booking for voice + app (docs/plan.md §4.3).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const serviceKey = Deno.env.get("CRAVE_SERVICE_ROLE_KEY") ?? "";

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
    party_size?: number;
    scheduled_at?: string | null;
    group_id?: string | null;
    dietary_notes?: string | null;
    context_tag?: string | null;
    voice_transcript?: string | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.restaurant_id) {
    return new Response(JSON.stringify({ error: "restaurant_id_required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const party = Number(body.party_size);
  if (!Number.isFinite(party) || party <= 0 || party > 500) {
    return new Response(JSON.stringify({ error: "invalid_party_size" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  const { data: row, error: insErr } = await admin
    .from("bookings")
    .insert({
      user_id: uid,
      restaurant_id: body.restaurant_id,
      group_id: body.group_id ?? null,
      party_size: Math.round(party),
      scheduled_at: body.scheduled_at ?? null,
      status: "confirmed",
      source: "partner_app",
      voice_transcript: body.voice_transcript ?? null,
      dietary_notes: body.dietary_notes ?? null,
      context_tag: body.context_tag ?? null,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return new Response(JSON.stringify({ error: "booking_insert_failed", detail: insErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      booking_id: row.id,
      restaurant_id: body.restaurant_id,
      status: "confirmed",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
