import { ChevronDown } from "lucide-react";

export function DashboardShowMore() {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand/95"
    >
      Show More
      <ChevronDown className="size-4 shrink-0" strokeWidth={2.5} />
    </button>
  );
}
