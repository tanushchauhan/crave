// CRAVE Edge: match-receipt-items (docs/supabase.md §11) — exact / trigram / embedding; Lambda passes x-crave-internal-secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-crave-internal-secret",
};

function vecToPgLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

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

  const serviceKey = Deno.env.get("CRAVE_SERVICE_ROLE_KEY");
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

  const { data: stage12Raw, error: rpcErr } = await supabase.rpc(
    "match_receipt_lines_exact_and_trigram",
    { p_receipt_id: body.receipt_id },
  );

  const stage12 =
    Array.isArray(stage12Raw) && stage12Raw.length > 0
      ? stage12Raw[0]
      : stage12Raw;

  if (rpcErr) {
    return new Response(
      JSON.stringify({
        error: "rpc_failed",
        message: rpcErr.message,
        details: rpcErr,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (stage12 && typeof stage12 === "object" && "error" in stage12) {
    return new Response(JSON.stringify(stage12), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const restaurantId =
    stage12 &&
    typeof stage12 === "object" &&
    stage12 !== null &&
    "restaurant_id" in stage12
      ? (stage12 as { restaurant_id: string }).restaurant_id
      : null;

  let embeddingMatched = 0;
  const awsBase = (Deno.env.get("CRAVE_AWS_API_BASE") || "").replace(/\/$/, "");

  if (restaurantId && awsBase) {
    const { data: lines, error: lineErr } = await supabase
      .from("receipt_line_items")
      .select("id, raw_text")
      .eq("receipt_id", body.receipt_id)
      .is("matched_menu_item_id", null);

    if (!lineErr && lines?.length) {
      for (const row of lines) {
        const raw = (row.raw_text || "").trim();
        if (!raw) continue;

        const embRes = await fetch(`${awsBase}/internal/embeddings/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-crave-internal-secret": secret,
          },
          body: JSON.stringify({ input: raw }),
        });

        if (!embRes.ok) {
          console.warn(
            "embedding http failed",
            row.id,
            embRes.status,
            await embRes.text(),
          );
          continue;
        }

        const embJson = (await embRes.json()) as {
          embedding?: number[];
        };
        const embedding = embJson.embedding;
        if (!Array.isArray(embedding) || embedding.length !== 1536) continue;

        const { data: embRpc, error: embRpcErr } = await supabase.rpc(
          "match_receipt_line_embedding",
          {
            p_line_id: row.id,
            p_restaurant_id: restaurantId,
            p_query: vecToPgLiteral(embedding),
            p_max_distance: 0.45,
          },
        );

        if (embRpcErr) {
          console.warn("match_receipt_line_embedding rpc", embRpcErr.message);
          continue;
        }
        if (
          embRpc &&
          typeof embRpc === "object" &&
          (embRpc as { matched?: boolean }).matched === true
        ) {
          embeddingMatched += 1;
        }
      }
    }
  }

  const { count: matchedCount, error: cntErr } = await supabase
    .from("receipt_line_items")
    .select("id", { count: "exact", head: true })
    .eq("receipt_id", body.receipt_id)
    .not("matched_menu_item_id", "is", null);

  if (cntErr) {
    console.warn("matched count query", cntErr.message);
  }

  return new Response(
    JSON.stringify({
      receipt_id: body.receipt_id,
      matched: matchedCount ?? 0,
      stages: {
        ...(typeof stage12 === "object" && stage12 !== null ? stage12 : {}),
        embedding: embeddingMatched,
        embedding_skipped: !awsBase,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
