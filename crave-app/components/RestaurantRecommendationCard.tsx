import { DEFAULT_RESTAURANT, type Restaurant } from "@/constants/orderingMockData";
import { cn } from "@/lib/utils";
import {
    MapPin,
    MoreHorizontal,
    Star,
    UtensilsCrossed,
} from "lucide-react-native";
import { useState } from "react";
import { Image, ImageBackground, Text, TouchableOpacity, View } from "react-native";

type RestaurantRecommendationCardProps = {
    restaurant?: Restaurant;
    onOrderPress?: (restaurant: Restaurant) => void;
    onMorePress?: (restaurant: Restaurant) => void;
};

function CuisineTag({ label }: { label: string }) {
    return (
        <View className="flex-row items-center gap-1 rounded-full bg-black/45 px-2.5 py-1">
            <MapPin size={10} color="#ffffff" />
            <Text className="font-josefin text-[11px] text-white">{label}</Text>
        </View>
    );
}

export default function RestaurantRecommendationCard({
    restaurant = DEFAULT_RESTAURANT,
    onOrderPress,
    onMorePress,
}: RestaurantRecommendationCardProps) {
    const [selectedThumb, setSelectedThumb] = useState(0);

    const chamfer = 28;

    return (
        <View className="mx-3 mt-3 overflow-hidden rounded-2xl bg-white shadow-black/15 shadow-md">
            <View className="overflow-hidden rounded-t-2xl">
                <ImageBackground
                    source={{ uri: restaurant.heroImage }}
                    className="min-h-[175px] w-full"
                    resizeMode="cover"
                    accessibilityLabel={`${restaurant.name} interior`}
                >
                    <View className="min-h-[175px] justify-between p-3">
                        <View className="flex-row items-start justify-between">
                            <View className="flex-row flex-wrap gap-2 pr-2">
                                {restaurant.cuisines.map((c) => (
                                    <CuisineTag key={c} label={c} />
                                ))}
                            </View>
                            <TouchableOpacity
                                onPress={() => onMorePress?.(restaurant)}
                                hitSlop={12}
                                className="h-8 w-8 items-center justify-center rounded-full bg-black/35"
                                accessibilityRole="button"
                                accessibilityLabel="More options"
                            >
                                <MoreHorizontal
                                    size={18}
                                    color="#ffffff"
                                    strokeWidth={2}
                                />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2">
                            {restaurant.thumbs.map((uri, i) => (
                                <TouchableOpacity
                                    key={uri}
                                    onPress={() => setSelectedThumb(i)}
                                    className={cn(
                                        "h-[42px] w-[42px] overflow-hidden rounded-md border-2",
                                        selectedThumb === i
                                            ? "border-[#f5861f]"
                                            : "border-transparent",
                                    )}
                                    accessibilityRole="imagebutton"
                                    accessibilityLabel={`Photo ${i + 1}`}
                                >
                                    <Image
                                        source={{ uri }}
                                        className="h-full w-full"
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ImageBackground>
            </View>

            <View className="relative overflow-hidden bg-[#2c2c2c] px-3 pb-4 pt-3">
                <View
                    pointerEvents="none"
                    className="absolute bg-white"
                    style={{
                        width: chamfer * 2,
                        height: chamfer * 2,
                        bottom: -chamfer,
                        right: -chamfer,
                        transform: [{ rotate: "45deg" }],
                    }}
                />

                <Text className="font-josefin-bold text-[15px] text-white underline decoration-white">
                    {restaurant.name}
                </Text>

                <Text className="mt-1 font-josefin-bold text-[12px] text-[#d9d9d9]">
                    {restaurant.distance}
                </Text>

                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <Star
                        size={14}
                        color="#f5c542"
                        fill="#f5c542"
                        strokeWidth={0}
                    />
                    <Text className="font-josefin text-[13px] text-white">
                        {restaurant.rating}
                    </Text>
                    <Text className="font-josefin text-[11px] text-[#d9d9d9]">
                        {restaurant.reviewCount}
                    </Text>
                </View>

                <Text className="mt-3 font-josefin text-[12px] leading-[18px] text-white">
                    {restaurant.customerQuote}
                </Text>

                <TouchableOpacity
                    onPress={() => onOrderPress?.(restaurant)}
                    activeOpacity={0.88}
                    className="mt-4 self-start flex-row items-center gap-2 rounded-full bg-[#f5861f] px-4 py-2.5"
                    accessibilityRole="button"
                    accessibilityLabel={`Order from ${restaurant.name}`}
                >
                    <UtensilsCrossed size={16} color="#ffffff" strokeWidth={2.2} />
                    <Text className="font-josefin-bold text-[13px] text-white">
                        Order
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
