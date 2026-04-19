"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Matches `PAGE_SIZE` in `menu-performance-table.tsx` */
const PAGE_SIZE = 6;

type TrendRow = {
  id: string;
  type: string;
  insight: string;
  status: string;
};

const rows: TrendRow[] = [
  {
    id: "t1",
    type: "Cuisine",
    insight: "Neighborhood craving Mediterranean small plates",
    status: "🔥 +40%",
  },
  {
    id: "t2",
    type: "Ingredient",
    insight: "Truffle mentions up in weekend reviews",
    status: "📈 +52%",
  },
  {
    id: "t3",
    type: "Dietary",
    insight: "Plant-forward requests climbing for brunch",
    status: "🌱 +42%",
  },
  {
    id: "t4",
    type: "Menu Item",
    insight: "Shareable desserts outperforming singles",
    status: "📍 Emerging",
  },
  {
    id: "t5",
    type: "Beverage",
    insight: "Zero-proof pairings requested with tasting menu",
    status: "📈 +18%",
  },
  {
    id: "t6",
    type: "Protein",
    insight: "Crispy chicken sandwiches outpacing beef burgers in lunch orders",
    status: "📈 +31%",
  },
  {
    id: "t7",
    type: "Flavor",
    insight: "Gochujang and chili crisp showing up in appetizer descriptions",
    status: "🔥 +28%",
  },
  {
    id: "t8",
    type: "Menu Item",
    insight: "Wood-fired pizzas and flatbreads trending for large parties",
    status: "📈 +24%",
  },
  {
    id: "t9",
    type: "Ingredient",
    insight: "Local citrus and seasonal berries in winter dessert searches",
    status: "🌱 +19%",
  },
  {
    id: "t10",
    type: "Cuisine",
    insight: "Peruvian and coastal Latin flavors gaining traction in reviews",
    status: "📍 Emerging",
  },
  {
    id: "t11",
    type: "Preparation",
    insight: "Guests asking for charcoal-grilled and open-flame cooking notes",
    status: "📈 +22%",
  },
  {
    id: "t12",
    type: "Dietary",
    insight: "Dairy-free swaps for pasta and risotto up sharply at dinner",
    status: "🌱 +35%",
  },
  {
    id: "t13",
    type: "Beverage",
    insight: "Natural wine and low-intervention pairings with chef’s menus",
    status: "🔥 +27%",
  },
  {
    id: "t14",
    type: "Ingredient",
    insight: "Umami-rich mushrooms and koji appearing in vegetarian mains",
    status: "📈 +21%",
  },
  {
    id: "t15",
    type: "Menu Item",
    insight: "Raw bar and crudo selections rising for weekend reservations",
    status: "📈 +33%",
  },
  {
    id: "t16",
    type: "Cuisine",
    insight: "Middle Eastern mezze and small plates requested for group tables",
    status: "📍 Emerging",
  },
  {
    id: "t17",
    type: "Flavor",
    insight: "Brown butter, miso, and caramelized notes in savory dishes",
    status: "📈 +16%",
  },
];

const colCount = 3;

export function AiTrendingTable() {
  const [pageIndex, setPageIndex] = useState(0);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPageIndex((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const displayedRows = useMemo(
    () => rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [pageIndex],
  );

  const rangeStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(rows.length, (pageIndex + 1) * PAGE_SIZE);

  const onPrevPage = () => setPageIndex((p) => Math.max(0, p - 1));
  const onNextPage = () => setPageIndex((p) => Math.min(totalPages - 1, p + 1));

  return (
    <Card className="gap-0 overflow-hidden border-2 border-brand bg-white py-0 text-dark shadow-none ring-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-brand/20 hover:bg-transparent">
              <TableHead className="font-semibold text-dark">Trend Type</TableHead>
              <TableHead className="font-semibold text-dark">Insight</TableHead>
              <TableHead className="min-w-[120px] font-semibold text-dark">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((r) => (
              <TableRow
                key={r.id}
                className="border-brand/15 hover:bg-light/60"
              >
                <TableCell className="font-medium text-dark">{r.type}</TableCell>
                <TableCell className="max-w-[220px] whitespace-normal text-sm text-gray-dark">
                  {r.insight}
                </TableCell>
                <TableCell className="text-sm font-semibold text-dark">
                  {r.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="border-0 bg-transparent p-0 hover:bg-transparent">
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={colCount} className="p-0">
                <div
                  className="flex flex-col gap-0 border-t border-brand/15 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3"
                  role="navigation"
                  aria-label="AI trending pagination"
                >
                  <p className="order-2 px-4 py-2 text-center text-xs text-gray-dark sm:order-1 sm:px-0 sm:py-0 sm:text-left sm:text-sm">
                    Showing{" "}
                    <span className="font-semibold text-dark">
                      {rangeStart}–{rangeEnd}
                    </span>{" "}
                    of <span className="font-semibold text-dark">{rows.length}</span>
                  </p>
                  <div className="order-1 flex items-center justify-center gap-2 sm:order-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-[5.5rem] border-brand/40 font-semibold text-dark hover:bg-light/80"
                      onClick={onPrevPage}
                      disabled={pageIndex <= 0}
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
                      disabled={pageIndex >= totalPages - 1}
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
