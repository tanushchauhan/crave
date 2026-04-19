import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardKpi } from "@/lib/dashboard/types";

type KpiRpc = {
  today_bookings?: number;
  yesterday_bookings?: number;
  avg_party_last_7d?: number;
  avg_party_prior_7d?: number;
  covers_last_7d?: number;
  covers_prior_7d?: number;
  sentiment_last_7d?: number;
  sentiment_prior_7d?: number;
};

function formatPctChange(curr: number, prev: number): { text: string; positive: boolean } {
  if (prev === 0 && curr === 0) return { text: "0%", positive: true };
  if (prev === 0) return { text: curr > 0 ? "+100%" : "0%", positive: curr >= 0 };
  const raw = ((curr - prev) / prev) * 100;
  const rounded = Math.round(raw * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return { text: `${sign}${rounded}%`, positive: rounded >= 0 };
}

function formatAvgDelta(curr: number, prev: number): { text: string; positive: boolean } {
  const d = Math.round((curr - prev) * 100) / 100;
  const sign = d > 0 ? "+" : "";
  return { text: `${sign}${d}`, positive: d >= 0 };
}

export async function loadDashboardKpis(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<{ kpis: DashboardKpi[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_dashboard_kpis", {
    p_restaurant_id: restaurantId,
  });

  if (error) {
    return {
      kpis: [
        {
          label: "Today's Bookings",
          value: "—",
          delta: "—",
          deltaPositive: true,
          caption: "Apply Supabase migration get_dashboard_kpis, then refresh.",
        },
        {
          label: "Average Party Size",
          value: "—",
          delta: "—",
          deltaPositive: true,
          caption: "Rolling 7 days vs prior 7 days",
        },
        {
          label: "Covers This Week",
          value: "—",
          delta: "—",
          deltaPositive: true,
          caption: "Sum of party sizes (rolling windows)",
        },
        {
          label: "Sentiment Score",
          value: "—",
          delta: "—",
          deltaPositive: true,
          caption: "Positive item feedback %",
        },
      ],
      error: error.message,
    };
  }

  const j = (data ?? {}) as KpiRpc;
  const today = Number(j.today_bookings) || 0;
  const yday = Number(j.yesterday_bookings) || 0;
  const avgCur = Number(j.avg_party_last_7d) || 0;
  const avgPrev = Number(j.avg_party_prior_7d) || 0;
  const covCur = Number(j.covers_last_7d) || 0;
  const covPrev = Number(j.covers_prior_7d) || 0;
  const sentCur = Number(j.sentiment_last_7d) || 0;
  const sentPrev = Number(j.sentiment_prior_7d) || 0;

  const dBook = formatPctChange(today, yday);
  const dAvg = formatAvgDelta(avgCur, avgPrev);
  const dCov = formatPctChange(covCur, covPrev);
  const dSent = formatPctChange(sentCur, sentPrev);

  const kpis: DashboardKpi[] = [
    {
      label: "Today's Bookings",
      value: String(today),
      delta: dBook.text,
      deltaPositive: dBook.positive,
      caption: "New bookings today vs yesterday (UTC, by created time)",
    },
    {
      label: "Average Party Size",
      value: avgCur > 0 ? avgCur.toFixed(1) : "0",
      delta: dAvg.text,
      deltaPositive: dAvg.positive,
      caption: "Rolling 7 days vs prior 7 days",
    },
    {
      label: "Covers This Week",
      value: String(covCur),
      delta: dCov.text,
      deltaPositive: dCov.positive,
      caption: "Sum of party sizes, rolling 7 days vs prior 7",
    },
    {
      label: "Sentiment Score",
      value: `${Math.round(sentCur)}`,
      delta: dSent.text,
      deltaPositive: dSent.positive,
      caption: "% of item feedback that was positive (7d vs prior 7d)",
    },
  ];

  return { kpis, error: null };
}
