export const MENU_CATEGORIES = [
  { slug: "uncategorized", label: "Uncategorized" },
  { slug: "appetizer", label: "Appetizer" },
  { slug: "entree", label: "Entree" },
  { slug: "dessert", label: "Dessert" },
  { slug: "salad", label: "Salad" },
  { slug: "soup", label: "Soup" },
  { slug: "beverage", label: "Beverage" },
] as const;

export type MenuCategorySlug = (typeof MENU_CATEGORIES)[number]["slug"];

export function categoryLabelToSlug(label: string): MenuCategorySlug {
  const t = label.trim().toLowerCase();
  const hit = MENU_CATEGORIES.find((c) => c.label.toLowerCase() === t);
  return hit?.slug ?? "uncategorized";
}

export function categorySlugToLabel(slug: string): string {
  const hit = MENU_CATEGORIES.find((c) => c.slug === slug);
  return hit?.label ?? "Uncategorized";
}
