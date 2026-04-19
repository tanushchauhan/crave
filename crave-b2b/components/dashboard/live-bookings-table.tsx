"use client";

import { useMemo, useState } from "react";
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
import type { LiveBookingTableRow } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const colCount = 6;

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
};

export function LiveBookingsTable({ rows: sourceRows }: LiveBookingsTableProps) {
  const [phoneFilter, setPhoneFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const rows = useMemo(
    () => sourceRows.map((r, defaultOrder) => ({ ...r, defaultOrder })),
    [sourceRows],
  );

  const displayedRows = useMemo(() => {
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
      list = [...list].sort((a, b) => a.defaultOrder - b.defaultOrder);
    }

    return list;
  }, [rows, phoneFilter, sortKey, sortDir]);

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
                        "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                        "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
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
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                    "hover:bg-light/60 focus-visible:ring-2 focus-visible:ring-brand/40"
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
                <DashboardShowMore />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
