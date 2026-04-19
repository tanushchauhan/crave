import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardShowMoreProps = {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** When true, the control is not rendered */
  hide?: boolean;
  label?: string;
};

export function DashboardShowMore({
  onClick,
  disabled,
  loading,
  hide,
  label = "Show more",
}: DashboardShowMoreProps) {
  if (hide) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex w-full items-center justify-center gap-2 bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand/95",
        (disabled || loading) && "cursor-not-allowed opacity-70",
      )}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2.5} aria-hidden />
      ) : (
        <ChevronDown className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
      )}
      {loading ? "Loading…" : label}
    </button>
  );
}
