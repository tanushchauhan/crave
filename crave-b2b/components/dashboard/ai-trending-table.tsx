"use client";

import { Card, CardContent } from "@/components/ui/card";
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

const rows = [
  {
    type: "Cuisine",
    insight: "Neighborhood craving Mediterranean small plates",
    status: "🔥 +40%",
  },
  {
    type: "Ingredient",
    insight: "Truffle mentions up in weekend reviews",
    status: "📈 +52%",
  },
  {
    type: "Dietary",
    insight: "Plant-forward requests climbing for brunch",
    status: "🌱 +42%",
  },
  {
    type: "Menu Item",
    insight: "Shareable desserts outperforming singles",
    status: "📍 Emerging",
  },
  {
    type: "Beverage",
    insight: "Zero-proof pairings requested with tasting menu",
    status: "📈 +18%",
  },
];

const colCount = 3;

export function AiTrendingTable() {
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
            {rows.map((r) => (
              <TableRow
                key={r.type + r.insight}
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
                <DashboardShowMore />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
