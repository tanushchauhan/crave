"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ThumbsDown,
  ThumbsUp,
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
import { MiniTrendSparkline } from "@/components/dashboard/mini-trend-sparkline";
import type { MenuPerformanceTableRow } from "@/lib/dashboard/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const colCount = 5;
const MENU_PAGE_SIZE = 8;

function parseRatePercent(rate: string): number {
  const n = Number.parseFloat(rate.replace("%", "").trim());
  return Number.isNaN(n) ? 0 : n;
}

type SortKey = "rate" | "likes" | "dislikes";
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

export type MenuPerformanceTableProps = {
  rows: MenuPerformanceTableRow[];
  restaurantId: string | null;
};

export function MenuPerformanceTable({ rows: sourceRows, restaurantId }: MenuPerformanceTableProps) {
  const [rows, setRows] = useState<MenuPerformanceTableRow[]>(sourceRows);
  const [visibleCount, setVisibleCount] = useState(MENU_PAGE_SIZE);
  const [foodFilter, setFoodFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setRows(sourceRows);
      setVisibleCount(MENU_PAGE_SIZE);
    });
    return () => cancelAnimationFrame(id);
  }, [sourceRows]);

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleMenuRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(async () => {
      refetchTimer.current = null;
      setRefreshing(true);
      try {
        const res = await fetch("/api/dashboard/menu-performance");
        const data = (await res.json()) as { rows?: MenuPerformanceTableRow[] };
        if (res.ok && Array.isArray(data.rows)) {
          setRows(data.rows);
        }
      } catch {
        /* ignore */
      } finally {
        setRefreshing(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createBrowserSupabaseClient();
    const handler = () => scheduleMenuRefetch();
    const channel = supabase
      .channel(`dashboard-menu-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "item_feedback", filter: `restaurant_id=eq.${restaurantId}` },
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
  }, [restaurantId, scheduleMenuRefetch]);

  const rowsWithOrder = useMemo(
    () => rows.map((r, defaultOrder) => ({ ...r, defaultOrder })),
    [rows],
  );

  const sortedFiltered = useMemo(() => {
    const q = foodFilter.trim().toLowerCase();
    let list = rowsWithOrder.filter((r) => {
      if (q === "") return true;
      return r.item.toLowerCase().includes(q);
    });

    if (sortKey !== null && sortDir !== null) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "rate") {
          cmp = parseRatePercent(a.rate) - parseRatePercent(b.rate);
        } else if (sortKey === "likes") {
          cmp = a.upCount - b.upCount;
        } else {
          cmp = a.downCount - b.downCount;
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    } else {
      list = [...list].sort((a, b) => a.defaultOrder - b.defaultOrder);
    }

    return list;
  }, [rowsWithOrder, foodFilter, sortKey, sortDir]);

  const displayedRows = useMemo(
    () => sortedFiltered.slice(0, visibleCount),
    [sortedFiltered, visibleCount],
  );

  const canShowMore = visibleCount < sortedFiltered.length;

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
              <TableHead className="font-semibold text-dark">
                <PopoverPrimitive.Root>
                  <PopoverPrimitive.Trigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex w-full items-center gap-1.5 rounded-md font-semibold text-dark",
                        "cursor-pointer text-left outline-none",
                        "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                      )}
                      aria-label="Filter food item"
                    >
                      Food Item
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
                        <Label htmlFor="food-item-filter" className="text-xs font-medium text-gray-dark">
                          Filter by food item
                        </Label>
                        <Input
                          id="food-item-filter"
                          type="search"
                          placeholder="e.g. Pizza"
                          value={foodFilter}
                          onChange={(e) => setFoodFilter(e.target.value)}
                          className="text-sm"
                          autoComplete="off"
                        />
                      </div>
                    </PopoverPrimitive.Content>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
              </TableHead>
              <TableHead
                className="font-semibold text-dark"
                aria-sort={ariaSortValue(sortStateFor("rate"))}
              >
                <button
                  type="button"
                  onClick={() => cycleSort("rate")}
                  className={cn(
                    "inline-flex items-center gap-1.5 font-semibold text-dark",
                    "cursor-pointer rounded-md outline-none",
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                >
                  Order Rate
                  <SortHeaderIcon dir={sortStateFor("rate")} />
                </button>
              </TableHead>
              <TableHead
                className="min-w-[5.5rem] text-center text-brand"
                aria-sort={ariaSortValue(sortStateFor("likes"))}
              >
                <button
                  type="button"
                  onClick={() => cycleSort("likes")}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-1 rounded-md py-0.5 outline-none",
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                  aria-label="Likes, sort column"
                >
                  <ThumbsUp className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                  <SortHeaderIcon dir={sortStateFor("likes")} />
                </button>
              </TableHead>
              <TableHead
                className="min-w-[5.5rem] text-center text-brand"
                aria-sort={ariaSortValue(sortStateFor("dislikes"))}
              >
                <button
                  type="button"
                  onClick={() => cycleSort("dislikes")}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-1 rounded-md py-0.5 outline-none",
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40",
                  )}
                  aria-label="Dislikes, sort column"
                >
                  <ThumbsDown className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                  <SortHeaderIcon dir={sortStateFor("dislikes")} />
                </button>
              </TableHead>
              <TableHead className="font-semibold text-dark">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow className="border-brand/15 hover:bg-transparent">
                <TableCell
                  colSpan={colCount}
                  className="py-10 text-center text-sm text-gray-dark"
                >
                  {refreshing ? "Refreshing…" : "No menu items yet, or performance data is still loading."}
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-brand/15 hover:bg-light/60"
                >
                  <TableCell className="font-medium text-dark">{r.item}</TableCell>
                  <TableCell className="text-sm text-gray-dark">{r.rate}</TableCell>
                  <TableCell className="text-center text-sm text-gray-dark">
                    {r.upCount}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-dark">
                    {r.downCount}
                  </TableCell>
                  <TableCell>
                    <MiniTrendSparkline up={r.up} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="border-0 bg-transparent p-0 hover:bg-transparent">
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={colCount} className="p-0">
                <DashboardShowMore
                  hide={sortedFiltered.length === 0 || !canShowMore}
                  onClick={() => setVisibleCount((c) => Math.min(c + MENU_PAGE_SIZE, sortedFiltered.length))}
                  loading={refreshing}
                  disabled={refreshing}
                />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
