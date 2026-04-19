import { RECOMMENDATION_HERO_IMAGE, RECOMMENDATION_THUMB_IMAGES } from "./recommendationFigmaAssets";

export type MenuItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUri?: string;
    tags?: string[];
    /** Like rate e.g. 88 with 460 ratings — matches Figma OrderNow_Menu_Open */
    likePercent?: number;
    likeCount?: number;
};

export type MenuCategory = {
    id: string;
    title: string;
    items: MenuItem[];
};

/** First reservation slot start (minutes from midnight) through last start, in local time */
export type RestaurantReservationWindow = {
    windowStartMinute: number;
    windowEndMinute: number;
    slotMinutes: number;
};

export type Restaurant = {
    id: string;
    name: string;
    rating: string;
    reviewCount: string;
    distance: string;
    /** Shown under menu title, e.g. "Austin TX" */
    cityLabel: string;
    /** Line under Menu Display, e.g. "Choices From 11:00 A.M - 9:00" */
    menuHoursLine: string;
    /** Booking slots for reservations (aligns with menuHoursLine) */
    reservation: RestaurantReservationWindow;
    cuisines: string[];
    customerQuote: string;
    heroImage: string;
    thumbs: readonly string[];
    menu: MenuCategory[];
};

export const DEFAULT_RESTAURANT: Restaurant = {
    id: "capital-day-grill",
    name: "Capital Day Grill",
    rating: "4.67",
    reviewCount: "69 reviews",
    distance: "3.00 mi.",
    cityLabel: "Austin TX",
    menuHoursLine: "Choices From 11:00 A.M - 9:00",
    reservation: {
        windowStartMinute: 11 * 60,
        windowEndMinute: 20 * 60 + 30,
        slotMinutes: 30,
    },
    cuisines: ["Barbecue", "American"],
    customerQuote:
        "Customers Say: Family-Friendly Vibe in this restaraunt, Singer Atharva's Dancing Really Surprised Customers,",
    heroImage: RECOMMENDATION_HERO_IMAGE,
    thumbs: RECOMMENDATION_THUMB_IMAGES,
    menu: [
        {
            id: "signatures",
            title: "Signatures",
            items: [
                {
                    id: "brisket-plate",
                    name: "Smoked Brisket Plate",
                    description:
                        "14 hour oak-smoked brisket, served with house pickles and Texas toast.",
                    price: 18.5,
                    imageUri: RECOMMENDATION_THUMB_IMAGES[0],
                    tags: ["Popular"],
                    likePercent: 92,
                    likeCount: 1840,
                },
                {
                    id: "rack-ribs",
                    name: "Half Rack Ribs",
                    description:
                        "Dry-rubbed St. Louis ribs, slow smoked and glazed with our house sauce.",
                    price: 21.0,
                    imageUri: RECOMMENDATION_THUMB_IMAGES[1],
                    tags: ["Chef pick"],
                    likePercent: 89,
                    likeCount: 620,
                },
            ],
        },
        {
            id: "handhelds",
            title: "Handhelds",
            items: [
                {
                    id: "smash-burger",
                    name: "Grill Smash Burger",
                    description:
                        "Double smashed patties, american cheese, crispy onions, grill sauce.",
                    price: 13.75,
                    imageUri: RECOMMENDATION_THUMB_IMAGES[2],
                    tags: ["Popular"],
                    likePercent: 85,
                    likeCount: 412,
                },
                {
                    id: "pulled-pork",
                    name: "Pulled Pork Sandwich",
                    description:
                        "Smoked pulled pork with slaw on a brioche bun.",
                    price: 12.25,
                    imageUri: RECOMMENDATION_THUMB_IMAGES[0],
                    tags: ["Spicy"],
                    likePercent: 81,
                    likeCount: 305,
                },
            ],
        },
        {
            id: "sides",
            title: "Sides",
            items: [
                {
                    id: "mac-cheese",
                    name: "Extra Cheddar Mac & Cheese",
                    description: "Cavatappi, three-cheese, smoked gouda crust.",
                    price: 3.5,
                    imageUri: RECOMMENDATION_THUMB_IMAGES[1],
                    likePercent: 88,
                    likeCount: 460,
                },
                {
                    id: "corn-bread",
                    name: "Chunky Potato Salad",
                    description: "Creamy Yukon golds, celery crunch, light dill.",
                    price: 3.5,
                    imageUri: RECOMMENDATION_THUMB_IMAGES[2],
                    tags: ["Veg"],
                    likePercent: 87,
                    likeCount: 272,
                },
            ],
        },
    ],
};
