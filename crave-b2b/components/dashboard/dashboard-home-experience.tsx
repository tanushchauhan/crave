"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { AiTrendingTable } from "@/components/dashboard/ai-trending-table";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { LiveBookingsTable } from "@/components/dashboard/live-bookings-table";
import { MenuPerformanceTable } from "@/components/dashboard/menu-performance-table";
import { CraveInChatView } from "@/components/crave-assistant/crave-in-chat-view";
import { ChatSearchBar } from "@/components/crave-assistant/chat-search-bar";
import { cn } from "@/lib/utils";
import type { DashboardLoadResult } from "@/lib/dashboard/load-dashboard-data";
import { DASHBOARD_LIVE_MERGED_CAP } from "@/lib/dashboard/load-dashboard-data";

const PRECHAT_EXIT_MS = 460;

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
  const title = restaurant
    ? `Welcome to Your Dashboard — ${restaurant.name}`
    : "Welcome to Your Dashboard";

  const [inChat, setInChat] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const [revealChat, setRevealChat] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!inChat) {
      setRevealChat(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealChat(true));
    });
    return () => cancelAnimationFrame(id);
  }, [inChat]);

  useEffect(() => {
    if (!inChat) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inChat]);

  function handleStartChat(message: string) {
    setFirstMessage(message);
    setInChat(true);
    setExiting(false);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = String(data.get("q") ?? "").trim();
    if (!q || exiting) return;
    setExiting(true);
    window.setTimeout(() => handleStartChat(q), PRECHAT_EXIT_MS);
  }

  return (
    <main className="relative flex min-h-[calc(100svh-4rem)] min-w-0 flex-1 flex-col bg-white font-sans">
      <div
        className={cn(
          "mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 pt-6 pb-8 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:px-8 sm:pt-7 sm:pb-10 lg:px-10",
          inChat ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
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

        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-dark transition-opacity duration-300 ease-out motion-reduce:transition-none sm:text-3xl lg:text-4xl",
            exiting && "opacity-0",
          )}
        >
          {title}
        </h1>

        <div className="mt-5 flex min-w-0 flex-col items-center sm:mt-6">
          <div
            className={cn(
              "relative h-16 w-36 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:h-20 sm:w-44",
              exiting && "pointer-events-none opacity-0",
            )}
          >
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
            className={cn(
              "mt-3 w-full max-w-3xl transition-all duration-500 ease-in-out motion-reduce:transition-none sm:mt-4 lg:max-w-4xl",
              exiting &&
                "translate-y-[min(36vh,18rem)] scale-[0.97] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100",
            )}
          >
            <ChatSearchBar name="q" id="dashboard-home-prechat-search" />
          </form>
        </div>

        <div
          className={cn(
            "mt-8 min-w-0 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:mt-10",
            exiting && "opacity-0",
          )}
        >
          <DashboardKpiGrid kpis={kpis} />
        </div>

        <section
          className={cn(
            "mt-12 min-w-0 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:mt-14 lg:mt-16",
            exiting && "opacity-0",
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
            "mt-12 grid min-w-0 grid-cols-1 gap-8 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:mt-14 lg:mt-16 lg:grid-cols-2 lg:gap-10",
            exiting && "opacity-0",
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

      {inChat ? (
        <div
          className={cn(
            "fixed inset-x-0 top-16 z-20 flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-white transition-opacity duration-300 ease-out motion-reduce:transition-none",
            revealChat ? "opacity-100" : "opacity-0",
          )}
        >
          <CraveInChatView initialUserMessage={firstMessage} />
        </div>
      ) : null}
    </main>
  );
}
