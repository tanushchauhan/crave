import { Mic, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DashboardSearch() {
  return (
    <div
      className="flex w-full min-w-0 max-w-full items-center gap-2 rounded-full border border-brand/35 bg-white px-3 py-2 shadow-[0_0_24px_-6px_rgba(255,117,31,0.45)] sm:gap-3 sm:px-4 sm:py-2.5 md:gap-4 md:px-5"
      role="search"
    >
      <Search className="size-5 shrink-0 text-brand sm:size-6" strokeWidth={2} />
      <Input
        type="search"
        placeholder="Ask Crave anything about your restaurant..."
        className="h-10 min-w-0 w-full flex-1 border-0 bg-transparent px-0 text-base text-dark shadow-none placeholder:text-gray focus-visible:ring-0 md:text-base"
      />
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          className="rounded-full p-2 text-brand transition-colors hover:bg-brand/10"
          aria-label="Voice search"
        >
          <Mic className="size-5 sm:size-6" strokeWidth={2} />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-brand transition-colors hover:bg-brand/10"
          aria-label="Add"
        >
          <Plus className="size-5 sm:size-6" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
