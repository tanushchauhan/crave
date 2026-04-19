// CRAVE Edge: resolve-group — match dining group by hint, return member ids + prefs (voice tool).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

type RpcMemberRow = {
    user_id: string;
    phone: string | null;
    display_name: string | null;
    pref_embedding: string | number[] | null;
};

function embeddingToNumbers(
    v: string | number[] | null | undefined,
): number[] | null {
    if (v == null) return null;
    if (Array.isArray(v)) return v.map(Number);
    if (typeof v === "string") {
        const s = v.trim();
        if (!s || s === "null") return null;
        try {
            const parsed: unknown = JSON.parse(s);
            if (Array.isArray(parsed)) {
                return parsed.map((x) => Number(x));
            }
        } catch {
            /* fall through */
        }
    }
    return null;
}

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

    const hintRaw = (body.nickname ?? body.group_hint ?? "").trim();
    const nickname = hintRaw || null;

    if (!hintRaw) {
        return new Response(
            JSON.stringify({
                user_id: userData.user.id,
                nickname,
                group_id: null,
                members: [],
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    const safeHint = hintRaw.replace(/[%_\\]/g, "");
    if (!safeHint) {
        return new Response(
            JSON.stringify({
                user_id: userData.user.id,
                nickname,
                group_id: null,
                members: [],
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    const pattern = `%${safeHint}%`;

    const { data: byName, error: nameErr } = await supabase
        .from("dining_groups")
        .select("id, name")
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(1);

    if (nameErr) {
        console.error("resolve-group: dining_groups name", nameErr);
        return new Response(
            JSON.stringify({ error: "query_failed", detail: nameErr.message }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }

    let group = byName?.[0] ?? null;
    if (!group) {
        const { data: byCtx, error: ctxErr } = await supabase
            .from("dining_groups")
            .select("id, name")
            .ilike("context_tag", pattern)
            .order("created_at", { ascending: false })
            .limit(1);
        if (ctxErr) {
            console.error("resolve-group: dining_groups context", ctxErr);
            return new Response(
                JSON.stringify({ error: "query_failed", detail: ctxErr.message }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                },
            );
        }
        group = byCtx?.[0] ?? null;
    }
    if (!group) {
        return new Response(
            JSON.stringify({
                user_id: userData.user.id,
                nickname,
                group_id: null,
                members: [],
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    const { data: memberRows, error: mErr } = await supabase.rpc(
        "list_group_members_with_prefs",
        { p_group_id: group.id },
    );

    if (mErr) {
        console.error("resolve-group: list_group_members_with_prefs", mErr);
        return new Response(
            JSON.stringify({ error: "rpc_failed", detail: mErr.message }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }

    const members = ((memberRows ?? []) as RpcMemberRow[]).map((r) => ({
        user_id: r.user_id,
        phone: r.phone,
        display_name: r.display_name,
        pref_embedding: embeddingToNumbers(r.pref_embedding),
    }));

    return new Response(
        JSON.stringify({
            user_id: userData.user.id,
            nickname,
            group_id: group.id,
            group_name: group.name,
            members,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
});
