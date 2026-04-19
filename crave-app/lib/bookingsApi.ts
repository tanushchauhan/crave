import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type BookingListRow = {
    id: string;
    user_id: string;
    group_id: string | null;
    restaurant_id: string | null;
    party_size: number;
    scheduled_at: string | null;
    status: string;
    dietary_notes: string | null;
    source: string;
    created_at: string;
    restaurants: { name: string } | null;
    dining_groups: { name: string } | null;
};

export type PartnerRestaurantOption = {
    id: string;
    name: string;
};

export type ConfirmBookingBody = {
    restaurant_id: string;
    party_size: number;
    scheduled_at?: string | null;
    group_id?: string | null;
    dietary_notes?: string | null;
    context_tag?: string | null;
    voice_transcript?: string | null;
};

type ConfirmBookingResponse = {
    booking_id?: string;
    restaurant_id?: string;
    status?: string;
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

export function formatBookingDateLabel(scheduledAt: string | null, createdAt: string): string {
    const raw = scheduledAt ?? createdAt;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
        return "TBD";
    }
    return d.toLocaleString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function bookingSearchText(row: BookingListRow): string {
    const venue = row.restaurants?.name ?? "Restaurant";
    const dateStr = formatBookingDateLabel(row.scheduled_at, row.created_at);
    const group = row.dining_groups?.name ?? "";
    return `${venue} ${dateStr} ${group}`.toLowerCase();
}

function asSingle<T extends { name?: string }>(
    v: T | T[] | null | undefined,
): T | null {
    if (v == null) {
        return null;
    }
    return Array.isArray(v) ? (v[0] ?? null) : v;
}

function normalizeBookingRow(raw: Record<string, unknown>): BookingListRow {
    return {
        id: String(raw.id),
        user_id: String(raw.user_id),
        group_id: raw.group_id == null ? null : String(raw.group_id),
        restaurant_id: raw.restaurant_id == null ? null : String(raw.restaurant_id),
        party_size: Number(raw.party_size),
        scheduled_at: raw.scheduled_at == null ? null : String(raw.scheduled_at),
        status: String(raw.status),
        dietary_notes: raw.dietary_notes == null ? null : String(raw.dietary_notes),
        source: String(raw.source),
        created_at: String(raw.created_at),
        restaurants: asSingle(raw.restaurants as { name: string } | { name: string }[] | null),
        dining_groups: asSingle(
            raw.dining_groups as { name: string } | { name: string }[] | null,
        ),
    };
}

export async function fetchMyBookings(): Promise<BookingListRow[]> {
    const { data, error } = await supabase
        .from("bookings")
        .select(
            `
      id,
      user_id,
      group_id,
      restaurant_id,
      party_size,
      scheduled_at,
      status,
      dietary_notes,
      source,
      created_at,
      restaurants ( name ),
      dining_groups ( name )
    `,
        )
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map(normalizeBookingRow);
}

export async function updateDietaryNotes(
    bookingId: string,
    dietaryNotes: string,
): Promise<void> {
    const { error } = await supabase
        .from("bookings")
        .update({ dietary_notes: dietaryNotes })
        .eq("id", bookingId);

    if (error) {
        throw new Error(error.message);
    }
}

export async function fetchPartnerRestaurants(): Promise<PartnerRestaurantOption[]> {
    const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("is_crave_partner", true)
        .order("name", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }
    return (data ?? []) as PartnerRestaurantOption[];
}

export async function createBookingViaEdge(
    body: ConfirmBookingBody,
): Promise<{ booking_id: string }> {
    const { data, error, response } = (await supabase.functions.invoke("confirm-booking", {
        body,
    })) as {
        data: ConfirmBookingResponse | null;
        error: Error | null;
        response?: Response;
    };

    if (error) {
        const detail = await describeFunctionsInvokeFailure(error, response);
        throw new Error(detail);
    }

    if (data && typeof data === "object" && typeof data.error === "string") {
        throw new Error(data.detail ?? data.error);
    }

    const id = data?.booking_id;
    if (!id) {
        throw new Error("confirm-booking: missing booking_id in response");
    }
    return { booking_id: id };
}
