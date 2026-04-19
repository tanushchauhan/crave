import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMenuPerformanceRows } from "@/lib/dashboard/build-menu-performance";
import { fetchMergedLiveRows } from "@/lib/dashboard/live-rows";
import { loadDashboardKpis } from "@/lib/dashboard/load-dashboard-kpis";
import type { DashboardKpi, LiveBookingTableRow, MenuPerformanceTableRow } from "@/lib/dashboard/types";

type OwnedRestaurant = { id: string; name: string };

const LIVE_FETCH_PER_TABLE = 45;
/** Exported for dashboard UI (e.g. “load older” when merge hit this cap) */
export const DASHBOARD_LIVE_MERGED_CAP = 60;

export type DashboardLoadResult = {
  restaurant: OwnedRestaurant | null;
  restaurantId: string | null;
  liveBookings: LiveBookingTableRow[];
  menuPerformance: MenuPerformanceTableRow[];
  kpis: DashboardKpi[];
  kpiLoadError: string | null;
  error: string | null;
};

export async function loadDashboardData(supabase: SupabaseClient): Promise<DashboardLoadResult> {
  const empty: DashboardLoadResult = {
    restaurant: null,
    restaurantId: null,
    liveBookings: [],
    menuPerformance: [],
    kpis: [],
    kpiLoadError: null,
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

  const [liveRes, menuRes, kpiRes] = await Promise.all([
    fetchMergedLiveRows(supabase, rid, {
      perTableLimit: LIVE_FETCH_PER_TABLE,
      maxMerged: DASHBOARD_LIVE_MERGED_CAP,
    }),
    buildMenuPerformanceRows(supabase, rid),
    loadDashboardKpis(supabase, rid),
  ]);

  const errors: string[] = [];
  if (liveRes.bookingsError) errors.push(liveRes.bookingsError);
  if (liveRes.ordersError) errors.push(liveRes.ordersError);
  if (menuRes.error) errors.push(menuRes.error);

  if (errors.length > 0) {
    return {
      restaurant: { id: restaurant.id, name: restaurant.name },
      restaurantId: rid,
      liveBookings: liveRes.rows,
      menuPerformance: [],
      kpis: kpiRes.kpis,
      kpiLoadError: kpiRes.error,
      error: errors.join("; "),
    };
  }

  return {
    restaurant: { id: restaurant.id, name: restaurant.name },
    restaurantId: rid,
    liveBookings: liveRes.rows,
    menuPerformance: menuRes.rows,
    kpis: kpiRes.kpis,
    kpiLoadError: kpiRes.error,
    error: null,
  };
}
