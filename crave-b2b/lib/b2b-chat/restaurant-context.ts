import type { MenuItemDbRow, RestaurantSummary } from "@/lib/menu/types";
import { formatPriceCents, parseMetadata } from "@/lib/menu/types";

/** Keep prompt bounded for Bedrock input limits and cost. */
const MAX_MENU_ITEMS = 100;
const MAX_DESC_CHARS = 240;

export type MenuContextRow = Pick<
  MenuItemDbRow,
  "name" | "description" | "price_cents" | "is_available" | "metadata"
>;

/**
 * Injected as the first `system` message on every B2B chat request so the model
 * knows the operator's restaurant and current menu (names, prices, availability).
 */
export function buildB2bRestaurantSystemPrompt(
  restaurant: RestaurantSummary,
  items: MenuContextRow[],
): string {
  const tags = restaurant.cuisine_tags?.filter(Boolean).join(", ") || "—";
  const lines: string[] = [
    "You are Crave, an assistant for a restaurant operator using the CRAVE B2B dashboard.",
    "Treat the restaurant and menu facts below as authoritative for this venue. Prefer them over general knowledge when they conflict.",
    "You do not have live database tools in this build—if the user asks for metrics or trends you cannot derive from this context, say what is missing instead of inventing numbers.",
    "",
    "## Restaurant",
    `- **id**: ${restaurant.id}`,
    `- **name**: ${restaurant.name}`,
    `- **cuisine tags**: ${tags}`,
    "",
    "## Menu items",
  ];

  const slice = items.slice(0, MAX_MENU_ITEMS);
  for (const row of slice) {
    const meta = parseMetadata(row.metadata);
    const parts: string[] = [
      `- **${row.name}**`,
      formatPriceCents(row.price_cents),
      row.is_available ? "available" : "unavailable",
    ];
    if (meta.category?.trim()) parts.push(`category: ${meta.category.trim()}`);
    if (meta.dietary?.trim()) parts.push(`dietary: ${meta.dietary.trim()}`);
    let desc = row.description?.trim() ?? "";
    if (desc.length > MAX_DESC_CHARS) {
      desc = `${desc.slice(0, MAX_DESC_CHARS - 1)}…`;
    }
    if (desc) parts.push(`description: ${desc}`);
    lines.push(parts.join(" — "));
  }

  if (items.length > MAX_MENU_ITEMS) {
    lines.push(
      `\n(${items.length - MAX_MENU_ITEMS} more items exist but were omitted to save context.)`,
    );
  } else if (slice.length === 0) {
    lines.push("(No menu items on file yet.)");
  }

  return lines.join("\n");
}
