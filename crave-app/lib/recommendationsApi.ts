import type { Restaurant } from "@/constants/orderingMockData";
import {
    mapRecommendApiToRestaurant,
    type RecommendApiMenuItem,
    type RecommendApiRestaurant,
} from "@/lib/recommendationsMap";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

type RecommendEntry = {
    restaurant: RecommendApiRestaurant;
    menu_items: RecommendApiMenuItem[];
};

type RecommendResponse = {
    user_id?: string;
    recommendations?: RecommendEntry[];
    error?: string;
    detail?: string;
};

function getResponseFromInvokeError(
    error: unknown,
    response?: Response,
): Response | undefined {
    if (response) {
        return response;
    }
    if (error instanceof FunctionsHttpError && error.context instanceof Response) {
        return error.context;
    }
    return undefined;
}

async function describeFunctionsInvokeFailure(
    error: unknown,
    response?: Response,
): Promise<string> {
    const res = getResponseFromInvokeError(error, response);
    if (res) {
        const status = res.status;
        try {
            const clone = res.clone();
            const ct = (clone.headers.get("content-type") ?? "").toLowerCase();
            if (ct.includes("application/json")) {
                const j: unknown = await clone.json();
                if (j && typeof j === "object") {
                    const o = j as Record<string, unknown>;
                    const detail =
                        typeof o.detail === "string"
                            ? o.detail
                            : typeof o.error === "string"
                              ? o.error
                              : JSON.stringify(j);
                    return `HTTP ${status}: ${detail}`;
                }
            }
            const text = (await clone.text()).trim();
            return text
                ? `HTTP ${status}: ${text.slice(0, 400)}`
                : `HTTP ${status}`;
        } catch {
            return `HTTP ${status} (unreadable body)`;
        }
    }
    return error instanceof Error ? error.message : String(error);
}

export type RecommendRequestGeo = {
    lat: number;
    lng: number;
    /** Meters; Edge clamps to 500–50_000; omit for server default (5000). */
    radius_m?: number;
};

export async function fetchRestaurantRecommendations(
    limit = 12,
    geo?: RecommendRequestGeo | null,
): Promise<Restaurant[]> {
    const body: Record<string, unknown> = { limit };
    if (
        geo &&
        Number.isFinite(geo.lat) &&
        Number.isFinite(geo.lng) &&
        geo.lat >= -90 &&
        geo.lat <= 90 &&
        geo.lng >= -180 &&
        geo.lng <= 180
    ) {
        body.lat = geo.lat;
        body.lng = geo.lng;
        if (
            geo.radius_m != null &&
            Number.isFinite(geo.radius_m) &&
            geo.radius_m > 0
        ) {
            body.radius_m = geo.radius_m;
        }
    }

    const { data, error, response } = (await supabase.functions.invoke(
        "recommend",
        { body },
    )) as {
        data: RecommendResponse | null;
        error: Error | null;
        response?: Response;
    };

    if (error) {
        const detail = await describeFunctionsInvokeFailure(error, response);
        if (__DEV__) {
            const status =
                response?.status ??
                (error instanceof FunctionsHttpError &&
                error.context instanceof Response
                    ? error.context.status
                    : undefined);
            console.warn("[recommend] invoke failed", {
                message: error.message,
                detail,
                status,
            });
        }
        throw new Error(detail);
    }

    if (__DEV__) {
        const n = data?.recommendations?.length ?? 0;
        console.log("[recommend] ok", { count: n });
    }

    if (!data) {
        throw new Error("Empty response from recommend");
    }

    if (typeof data.error === "string") {
        const tail = data.detail ? `: ${data.detail}` : "";
        throw new Error(`${data.error}${tail}`);
    }

    const recs = data.recommendations ?? [];
    return recs.map((r) =>
        mapRecommendApiToRestaurant(r.restaurant, r.menu_items ?? []),
    );
}
