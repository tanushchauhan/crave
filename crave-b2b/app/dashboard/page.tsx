import { AiTrendingTable } from "@/components/dashboard/ai-trending-table";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { LiveBookingsTable } from "@/components/dashboard/live-bookings-table";
import { MenuPerformanceTable } from "@/components/dashboard/menu-performance-table";

export default function DashboardPage() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white font-sans">
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-dark sm:text-3xl lg:text-4xl">
          Welcome to Your Dashboard Nandos . . .
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
          <LiveBookingsTable />
        </section>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:mt-14 lg:mt-16 lg:grid-cols-2 lg:gap-10">
          <section>
            <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
              Menu Performance
            </h2>
            <MenuPerformanceTable />
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
