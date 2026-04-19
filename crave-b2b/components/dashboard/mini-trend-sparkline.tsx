import { cn } from "@/lib/utils";

export function MiniTrendSparkline({ up }: { up: boolean }) {
  const d = up
    ? "M0,14 L8,10 L16,12 L24,5 L32,8 L40,4"
    : "M0,5 L8,9 L16,6 L24,13 L32,9 L40,12";

  return (
    <svg
      viewBox="0 0 40 16"
      className="h-7 w-[4.5rem] shrink-0"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        className={cn("stroke-[1.75]", up ? "stroke-emerald-500" : "stroke-red-500")}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
