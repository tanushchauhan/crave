// CRAVE Edge: generate-ad (optional, docs/supabase.md §11) — stub; Lambda should run Bedrock image gen + S3, then persist via this route or dashboard.
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "invalid_jwt" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { restaurant_id?: string; prompt?: string } = {};
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

  const { data: row, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", body.restaurant_id)
    .eq("owner_user_id", userData.user.id)
    .maybeSingle();

  if (error || !row) {
    return new Response(JSON.stringify({ error: "forbidden_or_not_found" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      restaurant_id: body.restaurant_id,
      prompt: body.prompt ?? null,
      message:
        "Stub: invoke Lambda (docs/aws.md §6.3) for Bedrock image gen, PutObject to S3, then insert ad_campaigns / ad_assets with returned URLs.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
