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

    const sim = restaurant.similarity;
    const customerQuote =
        typeof sim === "number" && Number.isFinite(sim)
            ? `Picked for your taste (distance ${sim.toFixed(3)}).`
            : "Curated near you.";

    return {
        id: restaurant.restaurant_id,
        name: restaurant.name,
        rating: "—",
        reviewCount: "—",
        distance: "—",
        cityLabel: "Near you",
        menuHoursLine: formatHoursLine(restaurant.hours),
        reservation: DEFAULT_RESERVATION,
        cuisines,
        customerQuote,
        heroImage: hero,
        thumbs: pickThumbs(restaurant.photo_urls ?? []),
        menu: mapMenuItems(menu_items),
    };
}
