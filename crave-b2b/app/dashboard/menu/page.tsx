import type { Metadata } from "next";
import { MenuManagementView } from "@/components/menu-management/menu-management-view";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MenuItemDbRow, RestaurantSummary } from "@/lib/menu/types";

export const metadata: Metadata = {
  title: "Menu Management",
};

export default async function MenuManagementPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <MenuManagementView
        key="no-user"
        restaurant={null}
        initialItems={[]}
        hasMultipleRestaurants={false}
        signedOut
      />
    );
  }

  const { data: restaurants, error: restaurantsError } = await supabase
    .from("restaurants")
    .select("id, name, cuisine_tags")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });

  if (restaurantsError) {
    return (
      <MenuManagementView
        key="restaurant-query-error"
        restaurant={null}
        initialItems={[]}
        hasMultipleRestaurants={false}
        loadError={restaurantsError.message}
      />
    );
  }

  if (!restaurants?.length) {
    return (
      <MenuManagementView
        key="no-restaurant"
        restaurant={null}
        initialItems={[]}
        hasMultipleRestaurants={false}
      />
    );
  }

  const restaurant = restaurants[0] as RestaurantSummary;
  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select(
      "id, restaurant_id, name, description, price_cents, image_url, is_available, created_at, metadata",
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return (
      <MenuManagementView
        key={restaurant.id}
        restaurant={restaurant}
        initialItems={[]}
        hasMultipleRestaurants={restaurants.length > 1}
        loadError={itemsError.message}
      />
    );
  }

  const initialItems = (items ?? []) as MenuItemDbRow[];

  return (
    <MenuManagementView
      key={restaurant.id}
      restaurant={restaurant}
      initialItems={initialItems}
      hasMultipleRestaurants={restaurants.length > 1}
    />
  );
}
