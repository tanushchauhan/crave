import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { DashboardKpi } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export type DashboardKpiGridProps = {
  kpis: DashboardKpi[];
};

const cardEntranceDelays = [
  "motion-safe:delay-0",
  "motion-safe:delay-75",
  "motion-safe:delay-100",
  "motion-safe:delay-150",
] as const;

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  if (!kpis.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
      {kpis.map((k, index) => (
        <div
          key={k.label}
          className={cn(
            "flex flex-col rounded-2xl bg-brand px-5 py-5 text-white sm:px-6 sm:py-6",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400 motion-safe:ease-out motion-safe:fill-mode-both",
            "transition-[transform,box-shadow] duration-200 ease-out motion-reduce:transition-none",
            "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg",
            cardEntranceDelays[index % cardEntranceDelays.length],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-semibold leading-tight text-white/95 sm:text-base">
              {k.label}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border border-white px-2.5 py-1 text-xs font-bold sm:text-sm",
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
