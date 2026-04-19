"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronDown,
  Plus,
  Search,
  SquarePen,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { AddItemDialog } from "@/components/menu-management/add-item-dialog";
import {
  EditItemDialog,
  type MenuItemRow,
} from "@/components/menu-management/edit-item-dialog";
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
import { cn } from "@/lib/utils";

const rawRows: MenuItemRow[] = [
  {
    category: "Appetizer",
    cuisine: "Italian",
    name: "Alfredo Pasta",
    dietary: "Halal, Vegetarian",
    price: "$9.99",
    description: "blah blah blah blah...",
  },
  {
    category: "Entree",
    cuisine: "Italian",
    name: "Alfredo Pasta",
    dietary: "Nuts, Gluten",
    price: "$9.99",
    description: "blah blah blah blah...",
  },
  {
    category: "Dessert",
    cuisine: "Italian",
    name: "Alfredo Pasta",
    dietary: "Halal, Vegetarian",
    price: "$9.99",
    description: "blah blah blah blah...",
  },
  {
    category: "Appetizer",
    cuisine: "Italian",
    name: "Bruschetta Trio",
    dietary: "Vegetarian",
    price: "$8.50",
    description: "blah blah blah blah...",
  },
  {
    category: "Entree",
    cuisine: "Italian",
    name: "Margherita Pizza",
    dietary: "Gluten, Dairy",
    price: "$14.00",
    description: "blah blah blah blah...",
  },
  {
    category: "Entree",
    cuisine: "Italian",
    name: "Chicken Parm",
    dietary: "Gluten",
    price: "$16.50",
    description: "blah blah blah blah...",
  },
  {
    category: "Salad",
    cuisine: "Italian",
    name: "Caprese Salad",
    dietary: "Vegetarian, Dairy",
    price: "$11.25",
    description: "blah blah blah blah...",
  },
  {
    category: "Soup",
    cuisine: "Italian",
    name: "Minestrone",
    dietary: "Vegan, Gluten",
    price: "$7.00",
    description: "blah blah blah blah...",
  },
  {
    category: "Dessert",
    cuisine: "Italian",
    name: "Tiramisu",
    dietary: "Alcohol, Dairy, Gluten",
    price: "$8.75",
    description: "blah blah blah blah...",
  },
  {
    category: "Beverage",
    cuisine: "Italian",
    name: "Espresso",
    dietary: "None",
    price: "$3.50",
    description: "blah blah blah blah...",
  },
  {
    category: "Appetizer",
    cuisine: "Italian",
    name: "Arancini",
    dietary: "Gluten, Dairy",
    price: "$10.00",
    description: "blah blah blah blah...",
  },
];

type Row = MenuItemRow & { defaultOrder: number };

const rows: Row[] = rawRows.map((r, defaultOrder) => ({ ...r, defaultOrder }));

const colCount = 7;

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function rowDietaryTags(dietary: string): string[] {
  return dietary
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function collectAllDietaryTags(data: Row[]): string[] {
  const seen = new Map<string, string>();
  for (const r of data) {
    for (const part of r.dietary.split(",")) {
      const t = part.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (!seen.has(key)) seen.set(key, t);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

function parsePriceNumeric(price: string): number {
  const n = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

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

const popoverContentClass = cn(
  "z-50 w-[min(calc(100vw-2rem),280px)] rounded-lg border border-brand/25 bg-white p-3 shadow-md",
  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
  "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
);

export function MenuManagementView() {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);

  const [nameFilter, setNameFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
  const [priceSortDir, setPriceSortDir] = useState<SortDir>(null);

  const uniqueCategories = useMemo(
    () => uniqueSorted(rows.map((r) => r.category)),
    []
  );
  const uniqueCuisines = useMemo(
    () => uniqueSorted(rows.map((r) => r.cuisine)),
    []
  );
  const dietaryTagOptions = useMemo(() => collectAllDietaryTags(rows), []);

  const displayedRows = useMemo(() => {
    const nameQ = nameFilter.trim().toLowerCase();
    const descQ = descriptionFilter.trim().toLowerCase();

    let list = rows.filter((r) => {
      if (categoryFilter !== null && r.category !== categoryFilter) {
        return false;
      }
      if (cuisineFilter !== null && r.cuisine !== cuisineFilter) {
        return false;
      }
      if (nameQ !== "" && !r.name.toLowerCase().includes(nameQ)) {
        return false;
      }
      if (descQ !== "" && !r.description.toLowerCase().includes(descQ)) {
        return false;
      }
      if (selectedDietaryTags.length > 0) {
        const tags = rowDietaryTags(r.dietary);
        const ok = selectedDietaryTags.every((sel) =>
          tags.includes(sel.toLowerCase())
        );
        if (!ok) return false;
      }
      return true;
    });

    if (priceSortDir !== null) {
      list = [...list].sort((a, b) => {
        const cmp =
          parsePriceNumeric(a.price) - parsePriceNumeric(b.price);
        return priceSortDir === "asc" ? cmp : -cmp;
      });
    } else {
      list = [...list].sort((a, b) => a.defaultOrder - b.defaultOrder);
    }

    return list;
  }, [
    nameFilter,
    descriptionFilter,
    selectedDietaryTags,
    categoryFilter,
    cuisineFilter,
    priceSortDir,
  ]);

  function cyclePriceSort() {
    if (priceSortDir === null) {
      setPriceSortDir("asc");
    } else if (priceSortDir === "asc") {
      setPriceSortDir("desc");
    } else {
      setPriceSortDir(null);
    }
  }

  function toggleDietaryTag(tag: string) {
    const key = tag.toLowerCase();
    setSelectedDietaryTags((prev) => {
      const has = prev.some((t) => t.toLowerCase() === key);
      if (has) return prev.filter((t) => t.toLowerCase() !== key);
      return [...prev, tag];
    });
  }

  function openEdit(row: Row) {
    setEditingRow(row);
    setEditOpen(true);
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-light font-sans">
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">
          Menu Management
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-relaxed text-gray-dark sm:text-lg">
          A real-time interface to seamlessly add, edit, price, and disable your
          menu items. Any changes made here instantly synchronize with the
          consumer app&apos;s visual menu and the AI voice agent&apos;s
          knowledge base.
        </p>

        <div className="mt-10 min-w-0 sm:mt-12">
          <Card className="gap-0 overflow-hidden border-4 border-brand bg-white py-0 text-dark shadow-none ring-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-brand/25 bg-white hover:bg-white">
                    <TableHead className="px-3 py-3 sm:px-4">
                      <PopoverPrimitive.Root>
                        <PopoverPrimitive.Trigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md font-bold text-dark outline-none",
                              "hover:bg-light/80 focus-visible:ring-2 focus-visible:ring-brand/40",
                              categoryFilter !== null && "text-brand"
                            )}
                            aria-label="Filter by category"
                          >
                            Category
                            <ChevronDown
                              className="size-4 shrink-0 text-brand"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Portal>
                          <PopoverPrimitive.Content
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            className={popoverContentClass}
                          >
                            <p className="mb-2 text-xs font-medium text-gray-dark">
                              Category
                            </p>
                            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => setCategoryFilter(null)}
                                className={cn(
                                  "rounded-md px-2 py-1.5 text-left text-sm text-dark",
                                  "hover:bg-light/80",
                                  categoryFilter === null &&
                                    "bg-brand/10 font-semibold text-brand"
                                )}
                              >
                                All categories
                              </button>
                              {uniqueCategories.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setCategoryFilter(c)}
                                  className={cn(
                                    "rounded-md px-2 py-1.5 text-left text-sm text-dark",
                                    "hover:bg-light/80",
                                    categoryFilter === c &&
                                      "bg-brand/10 font-semibold text-brand"
                                  )}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </PopoverPrimitive.Content>
                        </PopoverPrimitive.Portal>
                      </PopoverPrimitive.Root>
                    </TableHead>
                    <TableHead className="px-3 py-3 sm:px-4">
                      <PopoverPrimitive.Root>
                        <PopoverPrimitive.Trigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md font-bold text-dark outline-none",
                              "hover:bg-light/80 focus-visible:ring-2 focus-visible:ring-brand/40",
                              cuisineFilter !== null && "text-brand"
                            )}
                            aria-label="Filter by cuisine"
                          >
                            Cuisine
                            <ChevronDown
                              className="size-4 shrink-0 text-brand"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Portal>
                          <PopoverPrimitive.Content
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            className={popoverContentClass}
                          >
                            <p className="mb-2 text-xs font-medium text-gray-dark">
                              Cuisine
                            </p>
                            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => setCuisineFilter(null)}
                                className={cn(
                                  "rounded-md px-2 py-1.5 text-left text-sm text-dark",
                                  "hover:bg-light/80",
                                  cuisineFilter === null &&
                                    "bg-brand/10 font-semibold text-brand"
                                )}
                              >
                                All cuisines
                              </button>
                              {uniqueCuisines.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setCuisineFilter(c)}
                                  className={cn(
                                    "rounded-md px-2 py-1.5 text-left text-sm text-dark",
                                    "hover:bg-light/80",
                                    cuisineFilter === c &&
                                      "bg-brand/10 font-semibold text-brand"
                                  )}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </PopoverPrimitive.Content>
                        </PopoverPrimitive.Portal>
                      </PopoverPrimitive.Root>
                    </TableHead>
                    <TableHead className="px-3 py-3 sm:px-4">
                      <PopoverPrimitive.Root>
                        <PopoverPrimitive.Trigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md font-bold text-dark outline-none",
                              "hover:bg-light/80 focus-visible:ring-2 focus-visible:ring-brand/40",
                              nameFilter.trim() !== "" && "text-brand"
                            )}
                            aria-label="Filter by name"
                          >
                            Name
                            <Search
                              className="size-4 shrink-0 text-brand"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Portal>
                          <PopoverPrimitive.Content
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            className={popoverContentClass}
                          >
                            <div className="flex flex-col gap-2">
                              <Label
                                htmlFor="menu-filter-name"
                                className="text-xs font-medium text-gray-dark"
                              >
                                Filter by name
                              </Label>
                              <Input
                                id="menu-filter-name"
                                type="search"
                                value={nameFilter}
                                onChange={(e) => setNameFilter(e.target.value)}
                                placeholder="Search items…"
                                className="text-sm"
                                autoComplete="off"
                              />
                            </div>
                          </PopoverPrimitive.Content>
                        </PopoverPrimitive.Portal>
                      </PopoverPrimitive.Root>
                    </TableHead>
                    <TableHead className="px-3 py-3 sm:px-4">
                      <PopoverPrimitive.Root>
                        <PopoverPrimitive.Trigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md font-bold text-dark outline-none",
                              "hover:bg-light/80 focus-visible:ring-2 focus-visible:ring-brand/40",
                              selectedDietaryTags.length > 0 && "text-brand"
                            )}
                            aria-label="Filter by dietary tags"
                          >
                            Dietary Tags
                            <ChevronDown
                              className="size-4 shrink-0 text-brand"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Portal>
                          <PopoverPrimitive.Content
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            className={cn(popoverContentClass, "w-[min(calc(100vw-2rem),320px)]")}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-gray-dark">
                                Dietary tags (match all selected)
                              </p>
                              {selectedDietaryTags.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDietaryTags([])}
                                  className="text-xs font-semibold text-brand hover:underline"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-0.5">
                              {dietaryTagOptions.map((tag) => {
                                const checked = selectedDietaryTags.some(
                                  (t) => t.toLowerCase() === tag.toLowerCase()
                                );
                                return (
                                  <label
                                    key={tag}
                                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-dark hover:bg-light/80"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleDietaryTag(tag)}
                                      className="size-4 shrink-0 rounded border-brand text-brand accent-brand"
                                    />
                                    <span>{tag}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </PopoverPrimitive.Content>
                        </PopoverPrimitive.Portal>
                      </PopoverPrimitive.Root>
                    </TableHead>
                    <TableHead
                      className="px-3 py-3 sm:px-4"
                      aria-sort={ariaSortValue(priceSortDir)}
                    >
                      <button
                        type="button"
                        onClick={cyclePriceSort}
                        className={cn(
                          "inline-flex items-center gap-1.5 font-bold text-dark outline-none",
                          "cursor-pointer rounded-md",
                          "hover:bg-light/80 focus-visible:ring-2 focus-visible:ring-brand/40"
                        )}
                      >
                        Price
                        <SortHeaderIcon dir={priceSortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="px-3 py-3 sm:px-4">
                      <PopoverPrimitive.Root>
                        <PopoverPrimitive.Trigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md font-bold text-dark outline-none",
                              "hover:bg-light/80 focus-visible:ring-2 focus-visible:ring-brand/40",
                              descriptionFilter.trim() !== "" && "text-brand"
                            )}
                            aria-label="Filter by description"
                          >
                            Description
                            <Search
                              className="size-4 shrink-0 text-brand"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          </button>
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Portal>
                          <PopoverPrimitive.Content
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            className={popoverContentClass}
                          >
                            <div className="flex flex-col gap-2">
                              <Label
                                htmlFor="menu-filter-description"
                                className="text-xs font-medium text-gray-dark"
                              >
                                Filter by description
                              </Label>
                              <Input
                                id="menu-filter-description"
                                type="search"
                                value={descriptionFilter}
                                onChange={(e) =>
                                  setDescriptionFilter(e.target.value)
                                }
                                placeholder="Search descriptions…"
                                className="text-sm"
                                autoComplete="off"
                              />
                            </div>
                          </PopoverPrimitive.Content>
                        </PopoverPrimitive.Portal>
                      </PopoverPrimitive.Root>
                    </TableHead>
                    <TableHead className="px-3 py-3 text-left font-bold text-dark sm:px-4">
                      Edit
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.map((r) => (
                    <TableRow
                      key={r.defaultOrder}
                      className="border-brand/15 hover:bg-light/80"
                    >
                      <TableCell className="px-3 py-3 text-dark sm:px-4">
                        {r.category}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-dark sm:px-4">
                        {r.cuisine}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-dark sm:px-4">
                        {r.name}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-dark sm:px-4">
                        {r.dietary}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-dark sm:px-4">
                        {r.price}
                      </TableCell>
                      <TableCell className="max-w-[12rem] whitespace-normal px-3 py-3 text-dark sm:max-w-xs sm:px-4">
                        {r.description}
                      </TableCell>
                      <TableCell className="px-3 py-3 sm:px-4">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="inline-flex text-brand transition-opacity hover:opacity-85"
                          aria-label={`Edit ${r.name}`}
                        >
                          <SquarePen className="size-5" strokeWidth={2.25} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="border-0 bg-transparent p-0 hover:bg-transparent">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={colCount} className="p-0">
                      <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="flex w-full items-center justify-center gap-2 bg-brand py-3.5 text-base font-bold text-white transition-colors hover:bg-brand/95 sm:gap-2.5 sm:py-4 sm:text-lg"
                      >
                        <Plus
                          className="size-7 shrink-0 sm:size-8"
                          strokeWidth={3}
                          aria-hidden
                        />
                        Add Menu Item
                      </button>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditItemDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingRow(null);
        }}
        item={editingRow}
      />
    </main>
  );
}
