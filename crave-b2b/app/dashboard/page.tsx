import { AiTrendingTable } from "@/components/dashboard/ai-trending-table";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { LiveBookingsTable } from "@/components/dashboard/live-bookings-table";
import { MenuPerformanceTable } from "@/components/dashboard/menu-performance-table";
import { loadDashboardData } from "@/lib/dashboard/load-dashboard-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { restaurant, liveBookings, menuPerformance, error } =
    await loadDashboardData(supabase);

  const title = restaurant
    ? `Welcome to Your Dashboard — ${restaurant.name}`
    : "Welcome to Your Dashboard";

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white font-sans">
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        {error ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {!restaurant && !error ? (
          <p className="mb-4 rounded-lg border border-brand/25 bg-light/80 px-4 py-3 text-sm text-dark">
            No restaurant is linked to your account yet. Finish signup (including email
            confirmation if required) so we can attach your venue, or contact support.
          </p>
        ) : null}

        <h1 className="text-2xl font-bold tracking-tight text-dark sm:text-3xl lg:text-4xl">
          {title}
        </h1>

        <div className="mt-8 min-w-0 sm:mt-10">
          <DashboardSearch />
        </div>

        <div className="mt-10 sm:mt-12">
          <DashboardKpiGrid />
        </div>

        <section className="mt-12 sm:mt-14 lg:mt-16">
          <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
            Live Bookings and Orders
          </h2>
          <LiveBookingsTable rows={liveBookings} />
        </section>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:mt-14 lg:mt-16 lg:grid-cols-2 lg:gap-10">
          <section>
            <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
              Menu Performance
            </h2>
            <MenuPerformanceTable rows={menuPerformance} />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
              AI Trending Now
            </h2>
            <AiTrendingTable />
          </section>
        </div>
      </div>
    </main>
  );
}
