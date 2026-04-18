// CRAVE Edge: resolve-group (docs/supabase.md §11) — stub contract; wire to SQL + embeddings later.
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

  let body: { nickname?: string; group_hint?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  return new Response(
    JSON.stringify({
      user_id: userData.user.id,
      nickname: body.nickname ?? body.group_hint ?? null,
      members: [],
      message:
        "Stub: return group member ids + preference vectors from public.dining_groups / public.group_members in a follow-up.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
