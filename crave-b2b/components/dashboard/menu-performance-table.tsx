"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { MiniTrendSparkline } from "@/components/dashboard/mini-trend-sparkline";
import type { MenuPerformanceTableRow } from "@/lib/dashboard/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const colCount = 5;
/** Rows per page (matches previous “show more” step) */
const PAGE_SIZE = 8;

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
  const [pageIndex, setPageIndex] = useState(0);
  const [foodFilter, setFoodFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setRows(sourceRows);
      setPageIndex(0);
    });
    return () => cancelAnimationFrame(id);
  }, [sourceRows]);

  useEffect(() => {
    setPageIndex(0);
  }, [foodFilter, sortKey, sortDir]);

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

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));

  useEffect(() => {
    setPageIndex((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const displayedRows = useMemo(
    () =>
      sortedFiltered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [sortedFiltered, pageIndex],
  );

  const rangeStart = sortedFiltered.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(sortedFiltered.length, (pageIndex + 1) * PAGE_SIZE);

  const onPrevPage = () => setPageIndex((p) => Math.max(0, p - 1));
  const onNextPage = () => setPageIndex((p) => Math.min(totalPages - 1, p + 1));

  const showPaginationFooter = sortedFiltered.length > 0;

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
            {showPaginationFooter ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  <div
                    className="flex flex-col gap-0 border-t border-brand/15 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3"
                    role="navigation"
                    aria-label="Menu performance pagination"
                  >
                    <p className="order-2 px-4 py-2 text-center text-xs text-gray-dark sm:order-1 sm:px-0 sm:py-0 sm:text-left sm:text-sm">
                      Showing{" "}
                      <span className="font-semibold text-dark">
                        {rangeStart}–{rangeEnd}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-dark">{sortedFiltered.length}</span>
                    </p>
                    <div className="order-1 flex items-center justify-center gap-2 sm:order-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-[5.5rem] border-brand/40 font-semibold text-dark hover:bg-light/80"
                        onClick={onPrevPage}
                        disabled={pageIndex <= 0 || refreshing}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="size-4" aria-hidden />
                        Previous
                      </Button>
                      <span className="min-w-[6rem] text-center text-sm font-semibold tabular-nums text-dark">
                        Page {pageIndex + 1} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-[5.5rem] border-brand/40 font-semibold text-dark hover:bg-light/80"
                        onClick={onNextPage}
                        disabled={pageIndex >= totalPages - 1 || refreshing}
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
