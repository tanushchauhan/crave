import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { DashboardKpi } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export type DashboardKpiGridProps = {
  kpis: DashboardKpi[];
};

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  if (!kpis.length) {
    return null;
  }

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
