import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDashboardDate, formatDashboardTime } from "@/lib/dashboard/format-dashboard-datetime";
import type {
  LiveBookingTableRow,
  MenuPerformanceTableRow,
} from "@/lib/dashboard/types";

type OwnedRestaurant = { id: string; name: string };

type BookingQueryRow = {
  id: string;
  party_size: number;
  scheduled_at: string | null;
  created_at: string;
  dietary_notes: string | null;
  voice_transcript: string | null;
  users: { phone: string | null; display_name: string | null } | null;
};

type OrderQueryRow = {
  id: string;
  created_at: string;
  voice_transcript_summary: string | null;
  users: { phone: string | null; display_name: string | null } | null;
  order_items: {
    quantity: string | number;
    menu_items: { name: string } | null;
  }[] | null;
};

type MenuPerformanceRpcRow = {
  menu_item_id?: string;
  name?: string;
  views?: number;
  thumbs_up?: number;
  thumbs_down?: number;
};

const MENU_PERFORMANCE_DAYS = 7;

function menuPerformanceSinceIso(): string {
  const d = new Date();
  d.setTime(d.getTime() - MENU_PERFORMANCE_DAYS * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function chunkIds<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** menu_item_id → distinct order_ids that include that item */
function distinctOrdersPerMenuItem(
  lines: { order_id: string; menu_item_id: string }[],
): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const row of lines) {
    let s = m.get(row.menu_item_id);
    if (!s) {
      s = new Set();
      m.set(row.menu_item_id, s);
    }
    s.add(row.order_id);
  }
  return m;
}

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

function mergeLiveRows(
  bookings: BookingQueryRow[],
  orders: OrderQueryRow[],
): LiveBookingTableRow[] {
  type Merged = LiveBookingTableRow & { _ts: number };

  const merged: Merged[] = [];

  for (const b of bookings) {
    const whenRaw = b.scheduled_at ?? b.created_at;
    const when = new Date(whenRaw);
    const { food, notes } = bookingFoodNotes(b);
    merged.push({
      id: `booking:${b.id}`,
      food,
      phone: displayPhone(b.users),
      notes,
      size: String(b.party_size),
      date: formatDashboardDate(when),
      time: formatDashboardTime(when),
      _ts: when.getTime(),
    });
  }

  for (const o of orders) {
    const when = new Date(o.created_at);
    merged.push({
      id: `order:${o.id}`,
      food: orderFoodSummary(o),
      phone: displayPhone(o.users),
      notes: o.voice_transcript_summary?.trim() || "—",
      size: "—",
      date: formatDashboardDate(when),
      time: formatDashboardTime(when),
      _ts: when.getTime(),
    });
  }

  merged.sort((a, b) => b._ts - a._ts);
  return merged
    .slice(0, 50)
    .map(({ id, food, phone, notes, size, date, time }) => ({
      id,
      food,
      phone,
      notes,
      size,
      date,
      time,
    }));
}

function mapMenuPerformance(
  rows: MenuPerformanceRpcRow[],
  totalOrders: number,
  ordersPerMenuItem: Map<string, Set<string>>,
): MenuPerformanceTableRow[] {
  return rows.map((r, index) => {
    const name = r.name?.trim() || "Menu item";
    const up = Math.max(0, Number(r.thumbs_up) || 0);
    const down = Math.max(0, Number(r.thumbs_down) || 0);
    const mid = r.menu_item_id;
    const ordersWithItem =
      mid && ordersPerMenuItem.has(mid)
        ? (ordersPerMenuItem.get(mid)?.size ?? 0)
        : 0;
    const orderRatePct =
      totalOrders > 0 ? Math.round((100 * ordersWithItem) / totalOrders) : 0;
    return {
      id: mid ?? `idx-${index}`,
      item: name,
      rate: `${orderRatePct}%`,
      up: up >= down,
      upCount: up,
      downCount: down,
    };
  });
}

export type DashboardLoadResult = {
  restaurant: OwnedRestaurant | null;
  liveBookings: LiveBookingTableRow[];
  menuPerformance: MenuPerformanceTableRow[];
  error: string | null;
};

export async function loadDashboardData(
  supabase: SupabaseClient,
): Promise<DashboardLoadResult> {
  const empty: DashboardLoadResult = {
    restaurant: null,
    liveBookings: [],
    menuPerformance: [],
    error: null,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return empty;
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (restaurantError) {
    return { ...empty, error: restaurantError.message };
  }

  if (!restaurant) {
    return empty;
  }

  const rid = restaurant.id;
  const sinceIso = menuPerformanceSinceIso();

  const [bookingsRes, ordersRes, menuRes, ordersForRateRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, party_size, scheduled_at, created_at, dietary_notes, voice_transcript, users ( phone, display_name )",
      )
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("orders")
      .select(
        "id, created_at, voice_transcript_summary, users ( phone, display_name ), order_items ( quantity, menu_items ( name ) )",
      )
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.rpc("get_menu_performance", {
      p_restaurant_id: rid,
      p_days: MENU_PERFORMANCE_DAYS,
      p_item_substr: null,
    }),
    supabase.from("orders").select("id").eq("restaurant_id", rid).gte("created_at", sinceIso),
  ]);

  const errors = [bookingsRes.error, ordersRes.error, menuRes.error, ordersForRateRes.error].filter(
    Boolean,
  );
  if (errors.length > 0) {
    return {
      restaurant: { id: restaurant.id, name: restaurant.name },
      liveBookings: [],
      menuPerformance: [],
      error: errors.map((e) => e!.message).join("; "),
    };
  }

  const bookings = (bookingsRes.data ?? []) as unknown as BookingQueryRow[];
  const orders = (ordersRes.data ?? []) as unknown as OrderQueryRow[];

  let menuRows: MenuPerformanceRpcRow[] = [];
  const rawMenu = menuRes.data;
  if (Array.isArray(rawMenu)) {
    menuRows = rawMenu as MenuPerformanceRpcRow[];
  } else if (rawMenu && typeof rawMenu === "object" && "length" in rawMenu) {
    menuRows = Array.from(rawMenu as unknown as MenuPerformanceRpcRow[]);
  }

  const orderIds = (ordersForRateRes.data ?? []).map((o: { id: string }) => o.id);
  const totalOrders = orderIds.length;

  const orderItemLines: { order_id: string; menu_item_id: string }[] = [];
  if (orderIds.length > 0) {
    const chunks = chunkIds(orderIds, 120);
    const lineResults = await Promise.all(
      chunks.map((ids) =>
        supabase.from("order_items").select("order_id, menu_item_id").in("order_id", ids),
      ),
    );
    for (const res of lineResults) {
      if (res.error) {
        return {
          restaurant: { id: restaurant.id, name: restaurant.name },
          liveBookings: mergeLiveRows(bookings, orders),
          menuPerformance: [],
          error: res.error.message,
        };
      }
      const rows = (res.data ?? []) as { order_id: string; menu_item_id: string }[];
      orderItemLines.push(...rows);
    }
  }

  const ordersPerMenuItem = distinctOrdersPerMenuItem(orderItemLines);

  return {
    restaurant: { id: restaurant.id, name: restaurant.name },
    liveBookings: mergeLiveRows(bookings, orders),
    menuPerformance: mapMenuPerformance(menuRows, totalOrders, ordersPerMenuItem),
    error: null,
  };
}
