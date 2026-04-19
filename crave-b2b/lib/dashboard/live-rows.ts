import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDashboardDate, formatDashboardTime } from "@/lib/dashboard/format-dashboard-datetime";
import type { LiveBookingTableRow } from "@/lib/dashboard/types";

export type BookingQueryRow = {
  id: string;
  party_size: number;
  scheduled_at: string | null;
  created_at: string;
  dietary_notes: string | null;
  voice_transcript: string | null;
  users: { phone: string | null; display_name: string | null } | null;
};

export type OrderQueryRow = {
  id: string;
  created_at: string;
  voice_transcript_summary: string | null;
  users: { phone: string | null; display_name: string | null } | null;
  order_items: {
    quantity: string | number;
    menu_items: { name: string } | null;
  }[] | null;
};

function bookingFoodNotes(row: BookingQueryRow): { food: string; notes: string } {
  const vt = row.voice_transcript?.trim();
  const dn = row.dietary_notes?.trim();
  if (vt) {
    return { food: vt.length > 120 ? `${vt.slice(0, 117)}…` : vt, notes: dn ?? "—" };
  }
  if (dn) {
    return { food: "Table booking", notes: dn };
  }
  return { food: "Table booking", notes: "—" };
}

function orderFoodSummary(row: OrderQueryRow): string {
  const lines = row.order_items ?? [];
  if (lines.length === 0) {
    return row.voice_transcript_summary?.trim() || "Order";
  }
  const parts = lines.map((line) => {
    const q = Number(line.quantity);
    const name = line.menu_items?.name?.trim() || "Item";
    if (!Number.isFinite(q) || q <= 0) return name;
    if (q === 1) return `1 ${name}`;
    const rounded = Number.isInteger(q) ? String(q) : String(q);
    return `${rounded} ${name}`;
  });
  return parts.join(", ");
}

function displayPhone(u: { phone: string | null; display_name: string | null } | null): string {
  const p = u?.phone?.trim();
  if (p) return p;
  return "—";
}

function effectiveAtMsBooking(b: BookingQueryRow): number {
  return new Date(b.scheduled_at ?? b.created_at).getTime();
}

function effectiveAtMsOrder(o: OrderQueryRow): number {
  return new Date(o.created_at).getTime();
}

export function mergeLiveRowsFromQueries(
  bookings: BookingQueryRow[],
  orders: OrderQueryRow[],
  opts?: { beforeMs?: number; maxRows?: number },
): LiveBookingTableRow[] {
  const beforeMs = opts?.beforeMs;
  const maxRows = opts?.maxRows ?? 80;

  const merged: LiveBookingTableRow[] = [];

  for (const b of bookings) {
    const atMs = effectiveAtMsBooking(b);
    if (beforeMs !== undefined && atMs >= beforeMs) continue;
    const when = new Date(b.scheduled_at ?? b.created_at);
    const { food, notes } = bookingFoodNotes(b);
    merged.push({
      id: `booking:${b.id}`,
      food,
      phone: displayPhone(b.users),
      notes,
      size: String(b.party_size),
      date: formatDashboardDate(when),
      time: formatDashboardTime(when),
      atMs,
    });
  }

  for (const o of orders) {
    const atMs = effectiveAtMsOrder(o);
    if (beforeMs !== undefined && atMs >= beforeMs) continue;
    const when = new Date(o.created_at);
    merged.push({
      id: `order:${o.id}`,
      food: orderFoodSummary(o),
      phone: displayPhone(o.users),
      notes: o.voice_transcript_summary?.trim() || "—",
      size: "—",
      date: formatDashboardDate(when),
      time: formatDashboardTime(when),
      atMs,
    });
  }

  merged.sort((a, b) => b.atMs - a.atMs);
  return merged.slice(0, maxRows);
}

export type FetchMergedLiveRowsOptions = {
  /** Max rows fetched per bookings / orders query before merge */
  perTableLimit: number;
  /** If set, only rows strictly older than this instant (ms) */
  beforeMs?: number;
  /** Cap merged output length */
  maxMerged?: number;
};

export async function fetchMergedLiveRows(
  supabase: SupabaseClient,
  restaurantId: string,
  options: FetchMergedLiveRowsOptions,
): Promise<{ rows: LiveBookingTableRow[]; bookingsError?: string; ordersError?: string }> {
  const { perTableLimit, beforeMs, maxMerged = 80 } = options;

  const [bookingsRes, ordersRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, party_size, scheduled_at, created_at, dietary_notes, voice_transcript, users ( phone, display_name )",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(perTableLimit),
    supabase
      .from("orders")
      .select(
        "id, created_at, voice_transcript_summary, users ( phone, display_name ), order_items ( quantity, menu_items ( name ) )",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(perTableLimit),
  ]);

  if (bookingsRes.error) {
    return { rows: [], bookingsError: bookingsRes.error.message };
  }
  if (ordersRes.error) {
    return { rows: [], ordersError: ordersRes.error.message };
  }

  const bookings = (bookingsRes.data ?? []) as unknown as BookingQueryRow[];
  const orders = (ordersRes.data ?? []) as unknown as OrderQueryRow[];

  const rows = mergeLiveRowsFromQueries(bookings, orders, { beforeMs, maxRows: maxMerged });
  return { rows };
}

/** Replace the head of `current` with `freshTop` (same ids win from freshTop), keep unique tail by id. */
export function mergeLiveRowsAfterRefetch(
  current: LiveBookingTableRow[],
  freshTop: LiveBookingTableRow[],
  maxTotal = 100,
): LiveBookingTableRow[] {
  const freshIds = new Set(freshTop.map((r) => r.id));
  const tail = current.filter((r) => !freshIds.has(r.id));
  const merged = [...freshTop, ...tail].sort((a, b) => b.atMs - a.atMs);
  return merged.slice(0, maxTotal);
}
