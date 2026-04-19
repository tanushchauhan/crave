import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuPerformanceTableRow } from "@/lib/dashboard/types";

type MenuPerformanceRpcRow = {
  menu_item_id?: string;
  name?: string;
  views?: number;
  thumbs_up?: number;
  thumbs_down?: number;
};

export const MENU_PERFORMANCE_DAYS = 7;

export function menuPerformanceSinceIso(): string {
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
      mid && ordersPerMenuItem.has(mid) ? (ordersPerMenuItem.get(mid)?.size ?? 0) : 0;
    const orderRatePct = totalOrders > 0 ? Math.round((100 * ordersWithItem) / totalOrders) : 0;
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

export type BuildMenuPerformanceResult = {
  rows: MenuPerformanceTableRow[];
  error: string | null;
};

export async function buildMenuPerformanceRows(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<BuildMenuPerformanceResult> {
  const sinceIso = menuPerformanceSinceIso();

  const [menuRes, ordersForRateRes] = await Promise.all([
    supabase.rpc("get_menu_performance", {
      p_restaurant_id: restaurantId,
      p_days: MENU_PERFORMANCE_DAYS,
      p_item_substr: null,
    }),
    supabase.from("orders").select("id").eq("restaurant_id", restaurantId).gte("created_at", sinceIso),
  ]);

  if (menuRes.error) {
    return { rows: [], error: menuRes.error.message };
  }
  if (ordersForRateRes.error) {
    return { rows: [], error: ordersForRateRes.error.message };
  }

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
        return { rows: [], error: res.error.message };
      }
      orderItemLines.push(...((res.data ?? []) as { order_id: string; menu_item_id: string }[]));
    }
  }

  const ordersPerMenuItem = distinctOrdersPerMenuItem(orderItemLines);
  return {
    rows: mapMenuPerformance(menuRows, totalOrders, ordersPerMenuItem),
    error: null,
  };
}
