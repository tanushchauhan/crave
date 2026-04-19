export type MenuItemMetadata = {
  category?: string;
  dietary?: string;
  calories?: string;
};

export type MenuItemDbRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  metadata: MenuItemMetadata | Record<string, unknown> | null;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  cuisine_tags: string[] | null;
};

export type MenuTableRow = {
  id: string;
  category: string;
  cuisine: string;
  name: string;
  dietary: string;
  calories: string;
  price: string;
  description: string;
  is_available: boolean;
  image_url: string | null;
};

export function parseMetadata(raw: MenuItemDbRow["metadata"]): MenuItemMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
  return {
    category: str("category"),
    dietary: str("dietary"),
    calories: str("calories"),
  };
}

export function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Parses a user-entered dollar amount; returns null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function cuisineLabelFromTags(tags: string[] | null | undefined): string {
  if (!tags?.length) return "—";
  return tags.join(", ");
}

export function dbRowToTableRow(
  row: MenuItemDbRow,
  cuisineDisplay: string,
): MenuTableRow {
  const meta = parseMetadata(row.metadata);
  return {
    id: row.id,
    category: meta.category?.trim() ? meta.category.trim() : "Uncategorized",
    cuisine: cuisineDisplay,
    name: row.name,
    dietary: meta.dietary?.trim() ?? "",
    calories: meta.calories?.trim() ?? "",
    price: formatPriceCents(row.price_cents),
    description: row.description?.trim() ?? "",
    is_available: row.is_available,
    image_url: row.image_url,
  };
}
