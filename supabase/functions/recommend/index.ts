// CRAVE Edge: recommend — RPC rank + menu_items for mobile / voice.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

type RpcRow = {
    restaurant_id: string;
    name: string;
    cuisine_tags: string[] | null;
    photo_urls: string[] | null;
    hours: unknown;
    price_tier: number | null;
    similarity: number | null;
    star_rating: number | string | null;
    review_count: number | null;
    short_description: string | null;
    distance_label: string | null;
    distance_meters: number | null;
};

type MenuRow = {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    price_cents: number;
    image_url: string | null;
    is_available: boolean;
};

type RecommendBody = {
    limit?: unknown;
    lat?: unknown;
    lng?: unknown;
    radius_m?: unknown;
};

const DEFAULT_RADIUS_M = 5000;
const MIN_RADIUS_M = 500;
const MAX_RADIUS_M = 50000;

function parseRecommendRequest(req: Request): Promise<{
    limit: number;
    p_lat: number | null;
    p_lng: number | null;
    p_radius_m: number | null;
}> {
    if (req.method !== "POST") {
        return Promise.resolve({
            limit: 12,
            p_lat: null,
            p_lng: null,
            p_radius_m: null,
        });
    }
    return req
        .json()
        .then((body: RecommendBody) => {
            const n = body?.limit;
            const limit =
                typeof n === "number" && Number.isFinite(n)
                    ? Math.max(1, Math.min(50, Math.floor(n)))
                    : 12;

            let p_lat: number | null = null;
            let p_lng: number | null = null;
            const lat = body?.lat;
            const lng = body?.lng;
            if (
                typeof lat === "number" &&
                typeof lng === "number" &&
                Number.isFinite(lat) &&
                Number.isFinite(lng) &&
                lat >= -90 &&
                lat <= 90 &&
                lng >= -180 &&
                lng <= 180
            ) {
                p_lat = lat;
                p_lng = lng;
            }

            let p_radius_m: number | null = null;
            const rm = body?.radius_m;
            if (typeof rm === "number" && Number.isFinite(rm) && rm > 0) {
                p_radius_m = Math.max(
                    MIN_RADIUS_M,
                    Math.min(MAX_RADIUS_M, rm),
                );
            }

            return { limit, p_lat, p_lng, p_radius_m };
        })
        .catch(() => ({
            limit: 12,
            p_lat: null,
            p_lng: null,
            p_radius_m: null,
        }));
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

    const { limit, p_lat, p_lng, p_radius_m } = await parseRecommendRequest(
        req,
    );

    // Always pass all four keys so PostgREST matches the (integer, float8, float8, float8) overload;
    // omitting geo keys led to "function ... (p_lat, p_limit, p_lng, p_radius_m) not in schema cache" on some hosts.
    const rpcArgs = {
        p_limit: limit,
        p_lat: p_lat,
        p_lng: p_lng,
        p_radius_m:
            p_lat !== null && p_lng !== null
                ? (p_radius_m ?? DEFAULT_RADIUS_M)
                : null,
    };

    const { data: rows, error: rpcErr } = await supabase.rpc(
        "recommend_restaurants_for_user",
        rpcArgs,
    );

    if (rpcErr) {
        console.error("recommend: rpc recommend_restaurants_for_user", rpcErr);
        return new Response(
            JSON.stringify({ error: "rpc_failed", detail: rpcErr.message }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }

    const list = (rows ?? []) as RpcRow[];
    const ids = list.map((r) => r.restaurant_id).filter(Boolean);

    let menuByRestaurant = new Map<string, MenuRow[]>();
    if (ids.length > 0) {
        const { data: items, error: menuErr } = await supabase
            .from("menu_items")
            .select(
                "id, restaurant_id, name, description, price_cents, image_url, is_available",
            )
            .in("restaurant_id", ids)
            .eq("is_available", true)
            .order("name");

        if (menuErr) {
            console.error("recommend: menu_items query", menuErr);
        } else if (items) {
            for (const mi of items as MenuRow[]) {
                const arr = menuByRestaurant.get(mi.restaurant_id) ?? [];
                arr.push(mi);
                menuByRestaurant.set(mi.restaurant_id, arr);
            }
        }
    }

    const recommendations = list.map((row) => ({
        restaurant: {
            restaurant_id: row.restaurant_id,
            name: row.name,
            cuisine_tags: row.cuisine_tags ?? [],
            photo_urls: row.photo_urls ?? [],
            hours: row.hours ?? {},
            price_tier: row.price_tier,
            similarity: row.similarity,
            star_rating: row.star_rating,
            review_count: row.review_count,
            short_description: row.short_description,
            distance_label: row.distance_label,
            distance_meters: row.distance_meters,
        },
        menu_items: menuByRestaurant.get(row.restaurant_id) ?? [],
    }));

    return new Response(
        JSON.stringify({
            user_id: userData.user.id,
            recommendations,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
});
