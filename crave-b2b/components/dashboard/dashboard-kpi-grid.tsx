import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  caption: string;
};

const kpis: Kpi[] = [
  {
    label: "Today's Bookings",
    value: "578",
    delta: "-12.5%",
    deltaPositive: false,
    caption: "Trending down 1.5% today",
  },
  {
    label: "Average Party Size",
    value: "578",
    delta: "+4.2%",
    deltaPositive: true,
    caption: "Trending up 0.8% vs last week",
  },
  {
    label: "Covers This Week",
    value: "120",
    delta: "+8.1%",
    deltaPositive: true,
    caption: "Ahead of same period last week",
  },
  {
    label: "Sentiment Score",
    value: "90",
    delta: "+2.3%",
    deltaPositive: true,
    caption: "Based on recent guest feedback",
  },
];

export function DashboardKpiGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="flex flex-col rounded-2xl bg-brand px-5 py-5 text-white sm:px-6 sm:py-6"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-semibold leading-tight text-white/95 sm:text-base">
              {k.label}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-white px-2.5 py-1 text-xs font-bold sm:text-sm"
              )}
            >
              {k.deltaPositive ? (
                <ArrowUpRight className="size-3.5 sm:size-4" strokeWidth={2.5} />
              ) : (
                <ArrowDownRight className="size-3.5 sm:size-4" strokeWidth={2.5} />
              )}
              {k.delta}
            </span>
          </div>
          <p className="mt-5 text-4xl font-bold tracking-tight sm:mt-6 sm:text-5xl">
            {k.value}
          </p>
          <p className="mt-2 text-sm text-white/90">{k.caption}</p>
        </div>
      ))}
    </div>
  );
}
