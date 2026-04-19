"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Search,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardShowMore } from "@/components/dashboard/dashboard-show-more";
import { mergeLiveRowsAfterRefetch } from "@/lib/dashboard/live-rows";
import type { LiveBookingTableRow } from "@/lib/dashboard/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const colCount = 6;
const INITIAL_VISIBLE = 10;
const PAGE_STEP = 10;

function parsePartySize(size: string): number {
  const n = Number.parseInt(size, 10);
  return Number.isNaN(n) ? -1 : n;
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function parseTimeToMinutes(time: string): number {
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number.parseInt(m[1]!, 10);
  const min = Number.parseInt(m[2]!, 10);
  const ap = m[3]!.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function parseDateValue(dateStr: string): number {
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

type SortKey = "size" | "date" | "time";
type SortDir = "asc" | "desc" | null;

function SortHeaderIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") {
    return <ArrowUp className="size-4 shrink-0 text-brand" strokeWidth={2.5} aria-hidden />;
  }
  if (dir === "desc") {
    return <ArrowDown className="size-4 shrink-0 text-brand" strokeWidth={2.5} aria-hidden />;
  }
  return (
    <ArrowDownUp className="size-4 shrink-0 text-brand opacity-70" strokeWidth={2.5} aria-hidden />
  );
}

function ariaSortValue(dir: SortDir): "ascending" | "descending" | "none" {
  if (dir === "asc") return "ascending";
  if (dir === "desc") return "descending";
  return "none";
}

export type LiveBookingsTableProps = {
  rows: LiveBookingTableRow[];
  restaurantId: string | null;
  /** True when server returned a full merged cap (may exist older rows in DB) */
  mergedCapHit?: boolean;
};

export function LiveBookingsTable({
  rows: initialRows,
  restaurantId,
  mergedCapHit = false,
}: LiveBookingsTableProps) {
  const [rows, setRows] = useState<LiveBookingTableRow[]>(initialRows);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderExhausted, setOlderExhausted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setRows(initialRows);
      setVisibleCount(INITIAL_VISIBLE);
      setOlderExhausted(false);
    });
    return () => cancelAnimationFrame(id);
  }, [initialRows]);

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(async () => {
      refetchTimer.current = null;
      try {
        const res = await fetch("/api/dashboard/live-rows?limit=30");
        const data = (await res.json()) as { rows?: LiveBookingTableRow[] };
        if (res.ok && Array.isArray(data.rows)) {
          setRows((prev) => mergeLiveRowsAfterRefetch(prev, data.rows!, 120));
        }
      } catch {
        /* ignore */
      }
    }, 450);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createBrowserSupabaseClient();
    const handler = () => scheduleRefetch();
    const channel = supabase
      .channel(`dashboard-live-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `restaurant_id=eq.${restaurantId}` },
        handler,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        handler,
      )
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, scheduleRefetch]);

  const sortedFiltered = useMemo(() => {
    const q = phoneFilter.trim();
    let list = rows.filter((r) => {
      if (q === "") return true;
      const qDigits = digitsOnly(q);
      if (qDigits.length > 0) {
        return digitsOnly(r.phone).includes(qDigits);
      }
      return r.phone.toLowerCase().includes(q.toLowerCase());
    });

    if (sortKey !== null && sortDir !== null) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "size") {
          cmp = parsePartySize(a.size) - parsePartySize(b.size);
        } else if (sortKey === "date") {
          cmp = parseDateValue(a.date) - parseDateValue(b.date);
        } else {
          cmp = parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else {
      list = [...list].sort((a, b) => b.atMs - a.atMs);
    }

    return list;
  }, [rows, phoneFilter, sortKey, sortDir]);

  const displayedRows = useMemo(
    () => sortedFiltered.slice(0, visibleCount),
    [sortedFiltered, visibleCount],
  );

  const canShowMoreLocal = visibleCount < sortedFiltered.length;
  const canLoadOlderRemote =
    mergedCapHit &&
    !olderExhausted &&
    visibleCount >= sortedFiltered.length &&
    sortedFiltered.length > 0;

  async function loadOlderFromApi() {
    const oldest = sortedFiltered[sortedFiltered.length - 1];
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/dashboard/live-rows?before_ms=${encodeURIComponent(String(oldest.atMs))}&limit=25`,
      );
      const data = (await res.json()) as { rows?: LiveBookingTableRow[] };
      if (!res.ok || !Array.isArray(data.rows)) {
        setOlderExhausted(true);
        return;
      }
      if (data.rows.length === 0) {
        setOlderExhausted(true);
        return;
      }
      let appended = 0;
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const add = data.rows!.filter((r) => !seen.has(r.id));
        appended = add.length;
        if (add.length === 0) {
          return prev;
        }
        return [...prev, ...add].sort((a, b) => b.atMs - a.atMs);
      });
      if (appended > 0) {
        setVisibleCount((c) => c + appended);
      } else {
        setOlderExhausted(true);
      }
    } finally {
      setLoadingOlder(false);
    }
  }

  function onShowMore() {
    if (canShowMoreLocal) {
      setVisibleCount((c) => Math.min(c + PAGE_STEP, sortedFiltered.length));
      return;
    }
    if (canLoadOlderRemote) {
      void loadOlderFromApi();
    }
  }

  const showFooter =
    sortedFiltered.length > 0 &&
    (canShowMoreLocal || canLoadOlderRemote || loadingOlder);

  function cycleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    if (sortDir === null) {
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortDir(null);
    }
  }

  function sortStateFor(key: SortKey): SortDir {
    return sortKey === key ? sortDir : null;
  }

  return (
    <Card className="gap-0 overflow-hidden border-2 border-brand bg-white py-0 text-dark shadow-none ring-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-brand/20 hover:bg-transparent">
              <TableHead className="min-w-[140px] font-semibold text-dark">
                Food Ordered
              </TableHead>
              <TableHead className="text-dark">
                <PopoverPrimitive.Root>
                  <PopoverPrimitive.Trigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex w-full items-center gap-1.5 font-semibold text-dark",
                        "cursor-pointer rounded-md text-left outline-none",
                        "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                      )}
                      aria-label="Filter by phone number"
                    >
                      <Search
                        className="size-4 shrink-0 text-brand"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      Phone No.
                    </button>
                  </PopoverPrimitive.Trigger>
                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className={cn(
                        "z-50 w-[min(calc(100vw-2rem),280px)] rounded-lg border border-brand/25 bg-white p-3 shadow-md",
                        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                        "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="phone-filter" className="text-xs font-medium text-gray-dark">
                          Filter by phone
                        </Label>
                        <Input
                          id="phone-filter"
                          type="tel"
                          placeholder="e.g. 555 or 014-2201"
                          value={phoneFilter}
                          onChange={(e) => setPhoneFilter(e.target.value)}
                          className="text-sm"
                          autoComplete="off"
                        />
                      </div>
                    </PopoverPrimitive.Content>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
              </TableHead>
              <TableHead className="min-w-[120px] font-semibold text-dark">
                Notes
              </TableHead>
              <TableHead
                className="text-dark"
                aria-sort={ariaSortValue(sortStateFor("size"))}
              >
                <button
                  type="button"
                  onClick={() => cycleSort("size")}
                  className={cn(
                    "inline-flex items-center gap-1.5 font-semibold text-dark",
                    "cursor-pointer rounded-md outline-none",
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                >
                  Size
                  <SortHeaderIcon dir={sortStateFor("size")} />
                </button>
              </TableHead>
              <TableHead
                className="text-dark"
                aria-sort={ariaSortValue(sortStateFor("date"))}
              >
                <button
                  type="button"
                  onClick={() => cycleSort("date")}
                  className={cn(
                    "inline-flex items-center gap-1.5 font-semibold text-dark",
                    "cursor-pointer rounded-md outline-none",
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                >
                  Date
                  <SortHeaderIcon dir={sortStateFor("date")} />
                </button>
              </TableHead>
              <TableHead
                className="text-dark"
                aria-sort={ariaSortValue(sortStateFor("time"))}
              >
                <button
                  type="button"
                  onClick={() => cycleSort("time")}
                  className={cn(
                    "inline-flex items-center gap-1.5 font-semibold text-dark",
                    "cursor-pointer rounded-md outline-none",
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                >
                  Time
                  <SortHeaderIcon dir={sortStateFor("time")} />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow className="border-brand/15 hover:bg-transparent">
                <TableCell
                  colSpan={colCount}
                  className="py-10 text-center text-sm text-gray-dark"
                >
                  No bookings or orders yet for this restaurant.
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-brand/15 text-dark hover:bg-light/60"
                >
                  <TableCell className="max-w-[200px] whitespace-normal text-sm text-dark">
                    {r.food}
                  </TableCell>
                  <TableCell className="text-sm text-dark">{r.phone}</TableCell>
                  <TableCell className="max-w-[160px] whitespace-normal text-sm text-gray-dark">
                    {r.notes}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-dark">
                    {r.size}
                  </TableCell>
                  <TableCell className="text-sm text-gray-dark">{r.date}</TableCell>
                  <TableCell className="text-sm text-gray-dark">{r.time}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="border-0 bg-transparent p-0 hover:bg-transparent">
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={colCount} className="p-0">
                <DashboardShowMore
                  hide={!showFooter}
                  onClick={onShowMore}
                  loading={loadingOlder}
                  disabled={loadingOlder}
                  label={
                    canLoadOlderRemote && !canShowMoreLocal
                      ? "Load older entries"
                      : "Show more"
                  }
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
