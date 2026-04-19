"use client";

import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

const rawRows = [
  { item: "Pizza", rate: "15%", up: true, upCount: 42, downCount: 3 },
  { item: "Pasta", rate: "15%", up: false, upCount: 28, downCount: 5 },
  { item: "Burger", rate: "15%", up: true, upCount: 35, downCount: 4 },
  { item: "Salad", rate: "15%", up: true, upCount: 19, downCount: 2 },
  { item: "Soup", rate: "15%", up: false, upCount: 12, downCount: 6 },
];

type Row = (typeof rawRows)[number] & { defaultOrder: number };

const rows: Row[] = rawRows.map((r, defaultOrder) => ({ ...r, defaultOrder }));

const colCount = 5;

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

export function MenuPerformanceTable() {
  const [foodFilter, setFoodFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const displayedRows = useMemo(() => {
    const q = foodFilter.trim().toLowerCase();
    let list = rows.filter((r) => {
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
  }, [foodFilter, sortKey, sortDir]);

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
                        "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                        "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
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
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
            {displayedRows.map((r) => (
              <TableRow
                key={r.defaultOrder}
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
            ))}
          </TableBody>
          <TableFooter className="border-0 bg-transparent p-0 hover:bg-transparent">
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={colCount} className="p-0">
                <DashboardShowMore />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
