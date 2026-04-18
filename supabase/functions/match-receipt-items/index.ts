// CRAVE Edge: match-receipt-items (docs/supabase.md §11) — internal; Lambda passes CRAVE_INTERNAL_SECRET (same value as INTERNAL_HMAC_SECRET in docs/aws.md if you use one shared secret).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-crave-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = Deno.env.get("CRAVE_INTERNAL_SECRET");
  const provided = req.headers.get("x-crave-internal-secret");
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !url) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { receipt_id?: string; s3_etag?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.receipt_id) {
    return new Response(JSON.stringify({ error: "receipt_id_required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey);

  // docs/supabase.md §11 idempotency: optional s3_etag + existing lines → no-op.
  if (body.s3_etag) {
    const { data: cap } = await supabase
      .from("receipt_captures")
      .select("id, s3_etag")
      .eq("id", body.receipt_id)
      .maybeSingle();

    if (cap?.s3_etag === body.s3_etag) {
      const { count, error: cErr } = await supabase
        .from("receipt_line_items")
        .select("id", { count: "exact", head: true })
        .eq("receipt_id", body.receipt_id);
      if (!cErr && (count ?? 0) > 0) {
        return new Response(
          JSON.stringify({
            receipt_id: body.receipt_id,
            matched: 0,
            skipped: true,
            reason: "already_processed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  }

  return new Response(
    JSON.stringify({
      receipt_id: body.receipt_id,
      matched: 0,
      message:
        "Stub: implement exact/trigram/embedding updates on public.receipt_line_items (docs/plan.md §3.3 step 4).",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
