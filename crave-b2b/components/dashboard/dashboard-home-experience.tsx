"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { AiTrendingTable } from "@/components/dashboard/ai-trending-table";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { LiveBookingsTable } from "@/components/dashboard/live-bookings-table";
import { MenuPerformanceTable } from "@/components/dashboard/menu-performance-table";
import { ChatSearchBar } from "@/components/crave-assistant/chat-search-bar";
import {
  ASK_DRAFT_STORAGE_KEY,
  type UserContentPart,
} from "@/lib/b2b-chat/multipart-messages";
import type { DashboardLoadResult } from "@/lib/dashboard/load-dashboard-data";
import { DASHBOARD_LIVE_MERGED_CAP } from "@/lib/dashboard/load-dashboard-data";
import { cn } from "@/lib/utils";

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

  function handleAskSend(text: string, parts: UserContentPart[]) {
    if (parts.length > 0) {
      try {
        sessionStorage.setItem(ASK_DRAFT_STORAGE_KEY, JSON.stringify({ text, parts }));
      } catch {
        window.alert(
          "Those attachments are too large to send from the dashboard. Open Ask Crave from the menu and attach files there.",
        );
        return;
      }
      router.push("/dashboard/ask");
      return;
    }
    if (!text.trim()) return;
    router.push(`/dashboard/ask?q=${encodeURIComponent(text)}`);
  }

  return (
    <main className="relative flex min-h-[calc(100svh-4rem)] min-w-0 flex-1 flex-col bg-white font-sans">
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 pt-6 pb-8 sm:px-8 sm:pt-7 sm:pb-10 lg:px-10">
        {error ? (
          <p
            className={cn(
              "mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:ease-out",
            )}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {kpiLoadError && !error ? (
          <p
            className={cn(
              "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:ease-out",
            )}
            role="status"
          >
            KPIs partially unavailable ({kpiLoadError}). Apply the latest Supabase migration
            that adds the get_dashboard_kpis function, then refresh.
          </p>
        ) : null}

        {!restaurant && !error ? (
          <p
            className={cn(
              "mb-4 rounded-lg border border-brand/25 bg-light/80 px-4 py-3 text-sm text-dark",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:ease-out",
            )}
          >
            No restaurant is linked to your account yet. Finish signup (including email
            confirmation if required) so we can attach your venue, or contact support.
          </p>
        ) : null}

        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-dark sm:text-3xl lg:text-4xl",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:ease-out motion-safe:fill-mode-both",
          )}
        >
          {title}
        </h1>

        <div
          className={cn(
            "mt-5 flex min-w-0 flex-col items-center sm:mt-6",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out motion-safe:delay-75 motion-safe:fill-mode-both",
          )}
        >
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
          <div className="mt-3 w-full max-w-3xl sm:mt-4 lg:max-w-4xl">
            <ChatSearchBar id="dashboard-home-prechat-search" onSend={handleAskSend} />
          </div>
        </div>

        <div
          className={cn(
            "mt-8 min-w-0 sm:mt-10",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out motion-safe:delay-100 motion-safe:fill-mode-both",
          )}
        >
          <DashboardKpiGrid kpis={kpis} />
        </div>

        <section
          className={cn(
            "mt-12 min-w-0 sm:mt-14 lg:mt-16",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out motion-safe:delay-150 motion-safe:fill-mode-both",
          )}
        >
          <h2 className="mb-3 text-lg font-bold text-brand sm:text-xl">
            Live Bookings and Orders
          </h2>
          <LiveBookingsTable
            rows={liveBookings}
            restaurantId={restaurantId}
            mergedCapHit={liveBookings.length >= DASHBOARD_LIVE_MERGED_CAP}
          />
        </section>

        <div
          className={cn(
            "mt-12 grid min-w-0 grid-cols-1 gap-8 sm:mt-14 lg:mt-16 lg:grid-cols-2 lg:gap-10",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out motion-safe:delay-200 motion-safe:fill-mode-both",
          )}
        >
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
