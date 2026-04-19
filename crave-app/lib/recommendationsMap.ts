import {
    RECOMMENDATION_HERO_IMAGE,
    RECOMMENDATION_THUMB_IMAGES,
} from "@/constants/recommendationFigmaAssets";
import type {
    MenuCategory,
    MenuItem,
    Restaurant,
    RestaurantReservationWindow,
} from "@/constants/orderingMockData";

export type RecommendApiRestaurant = {
    restaurant_id: string;
    name: string;
    cuisine_tags: string[];
    photo_urls: string[];
    hours: unknown;
    price_tier: number | null;
    similarity: number | null;
    star_rating?: number | string | null;
    review_count?: number | null;
    short_description?: string | null;
    distance_label?: string | null;
    distance_meters?: number | null;
};

export type RecommendApiMenuItem = {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    price_cents: number;
    image_url: string | null;
    is_available: boolean;
};

const DEFAULT_RESERVATION: RestaurantReservationWindow = {
    windowStartMinute: 11 * 60,
    windowEndMinute: 20 * 60 + 30,
    slotMinutes: 30,
};

function formatHoursLine(hours: unknown): string {
    if (hours == null || hours === "") {
        return "Hours vary — see restaurant";
    }
    if (typeof hours === "string") {
        return hours;
    }
    try {
        const s = JSON.stringify(hours);
        return s.length > 90 ? `${s.slice(0, 87)}…` : s;
    } catch {
        return "Hours vary";
    }
}

function parseStarRating(raw: number | string | null | undefined): number | null {
    if (raw == null) return null;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
        const n = Number.parseFloat(raw);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function formatDistanceLine(
    meters: number | null | undefined,
    fallbackLabel: string | null | undefined,
): string {
    if (typeof meters === "number" && Number.isFinite(meters) && meters >= 0) {
        const mi = meters / 1609.344;
        const digits = mi < 10 ? 2 : 1;
        return `${mi.toFixed(digits)} mi. away`;
    }
    const label = fallbackLabel?.trim().replace(/\.$/, "");
    if (label) {
        if (/\baway\b/i.test(label)) return label.endsWith(".") ? label : `${label}.`;
        if (/\bmi\b|km\b|min\b/i.test(label)) {
            return label.endsWith(".") ? label : `${label}. away`;
        }
        return `${label} away`;
    }
    return "Nearby";
}

function formatReviewLine(count: number | null | undefined): string {
    if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
        return `${Math.round(count)} reviews`;
    }
    return "—";
}

function formatRatingLine(star: number | null): string {
    if (star != null && Number.isFinite(star)) {
        return star.toFixed(2);
    }
    return "—";
}

function pickThumbs(photoUrls: string[]): readonly string[] {
    const out = [...photoUrls].filter(Boolean).slice(0, 3);
    if (out.length >= 3) {
        return out as readonly string[];
    }
    const pad = [...out];
    let i = 0;
    while (pad.length < 3) {
        pad.push(RECOMMENDATION_THUMB_IMAGES[i % RECOMMENDATION_THUMB_IMAGES.length]);
        i += 1;
    }
    return pad as readonly string[];
}

function mapMenuItems(rows: RecommendApiMenuItem[]): MenuCategory[] {
    const items: MenuItem[] = rows.map((mi) => ({
        id: mi.id,
        name: mi.name,
        description: mi.description?.trim() || " ",
        price: Math.round((mi.price_cents / 100) * 100) / 100,
        imageUri: mi.image_url ?? undefined,
    }));
    if (items.length === 0) {
        return [
            {
                id: "menu",
                title: "Menu",
                items: [
                    {
                        id: "no-menu-placeholder",
                        name: "No menu items yet",
                        description: "This venue has no published dishes in Crave.",
                        price: 0,
                    },
                ],
            },
        ];
    }
    return [{ id: "menu", title: "Menu", items }];
}

export function mapRecommendApiToRestaurant(
    restaurant: RecommendApiRestaurant,
    menu_items: RecommendApiMenuItem[],
): Restaurant {
    const hero =
        restaurant.photo_urls?.find((u) => Boolean(u)) ?? RECOMMENDATION_HERO_IMAGE;
    const cuisines =
        restaurant.cuisine_tags?.length > 0
            ? restaurant.cuisine_tags
            : ["Dining"];

    const star = parseStarRating(restaurant.star_rating);
    const customerQuote =
        restaurant.short_description?.trim() ||
        (typeof restaurant.similarity === "number" &&
        Number.isFinite(restaurant.similarity)
            ? `Picked for your taste (match ${restaurant.similarity.toFixed(3)}).`
            : "Curated near you.");

    return {
        id: restaurant.restaurant_id,
        name: restaurant.name,
        rating: formatRatingLine(star),
        reviewCount: formatReviewLine(restaurant.review_count ?? null),
        distance: formatDistanceLine(
            restaurant.distance_meters ?? null,
            restaurant.distance_label ?? null,
        ),
        cityLabel: "Austin TX",
        menuHoursLine: formatHoursLine(restaurant.hours),
        reservation: DEFAULT_RESERVATION,
        cuisines,
        customerQuote,
        heroImage: hero,
        thumbs: pickThumbs(restaurant.photo_urls ?? []),
        menu: mapMenuItems(menu_items),
    };
}
