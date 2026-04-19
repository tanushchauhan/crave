"use client";

import { useRouter } from "next/navigation";
import { type FormEvent } from "react";
import Image from "next/image";
import { AiTrendingTable } from "@/components/dashboard/ai-trending-table";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { LiveBookingsTable } from "@/components/dashboard/live-bookings-table";
import { MenuPerformanceTable } from "@/components/dashboard/menu-performance-table";
import { ChatSearchBar } from "@/components/crave-assistant/chat-search-bar";
import type { DashboardLoadResult } from "@/lib/dashboard/load-dashboard-data";
import { DASHBOARD_LIVE_MERGED_CAP } from "@/lib/dashboard/load-dashboard-data";

type DashboardHomeExperienceProps = DashboardLoadResult;

export function DashboardHomeExperience({
  restaurant,
  restaurantId,
  liveBookings,
  menuPerformance,
  kpis,
  kpiLoadError,
  error,
}: DashboardHomeExperienceProps) {
  const router = useRouter();
  const title = restaurant
    ? `Welcome to Your Dashboard — ${restaurant.name}`
    : "Welcome to Your Dashboard";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = String(data.get("q") ?? "").trim();
    if (!q) return;
    router.push(`/dashboard/ask?q=${encodeURIComponent(q)}`);
  }

  return (
    <main className="relative flex min-h-[calc(100svh-4rem)] min-w-0 flex-1 flex-col bg-white font-sans">
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 pt-6 pb-8 sm:px-8 sm:pt-7 sm:pb-10 lg:px-10">
        {error ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {kpiLoadError && !error ? (
          <p
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            KPIs partially unavailable ({kpiLoadError}). Apply the latest Supabase migration
            that adds the get_dashboard_kpis function, then refresh.
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

        <div className="mt-5 flex min-w-0 flex-col items-center sm:mt-6">
          <div className="relative h-16 w-36 sm:h-20 sm:w-44">
            <Image
              src="/craveLogo.svg"
              alt="Crave"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 640px) 144px, 176px"
              unoptimized
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(2400%) hue-rotate(352deg) brightness(103%) contrast(101%)",
              }}
            />
          </div>
          <form
            onSubmit={handleSubmit}
            className="mt-3 w-full max-w-3xl sm:mt-4 lg:max-w-4xl"
          >
            <ChatSearchBar name="q" id="dashboard-home-prechat-search" />
          </form>
        </div>

        <div className="mt-8 min-w-0 sm:mt-10">
          <DashboardKpiGrid kpis={kpis} />
        </div>

        <section className="mt-12 min-w-0 sm:mt-14 lg:mt-16">
          <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
            Live Bookings and Orders
          </h2>
          <LiveBookingsTable
            rows={liveBookings}
            restaurantId={restaurantId}
            mergedCapHit={liveBookings.length >= DASHBOARD_LIVE_MERGED_CAP}
          />
        </section>

        <div className="mt-12 grid min-w-0 grid-cols-1 gap-8 sm:mt-14 lg:mt-16 lg:grid-cols-2 lg:gap-10">
          <section>
            <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
              Menu Performance
            </h2>
            <MenuPerformanceTable rows={menuPerformance} restaurantId={restaurantId} />
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
