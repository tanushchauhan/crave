import { Plus, ThumbsUp } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import type { MenuItem } from "@/constants/orderingMockData";

type MenuItemCardProps = {
    item: MenuItem;
    quantity?: number;
    onAdd?: (item: MenuItem) => void;
    onRemove?: (item: MenuItem) => void;
    /** Figma OrderNow_Menu_Open uses a two-column tile layout */
    variant?: "list" | "grid";
};

function LikeRow({ item }: { item: MenuItem }) {
    if (item.likePercent == null || item.likeCount == null) return null;
    return (
        <View className="mt-1 flex-row items-center gap-1">
            <ThumbsUp size={11} color="#555" strokeWidth={2} />
            <Text className="font-josefin-bold text-[10px] text-[#434343]">
                {item.likePercent}% ({item.likeCount})
            </Text>
        </View>
    );
}

export default function MenuItemCard({
    item,
    quantity = 0,
    onAdd,
    onRemove,
    variant = "list",
}: MenuItemCardProps) {
    const priceLabel = `$${item.price.toFixed(2)}+`;

    if (variant === "grid") {
        return (
            <View className="overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white">
                <View className="relative h-[104px] w-full bg-[#f0f0f0]">
                    {item.imageUri ? (
                        <Image
                            source={{ uri: item.imageUri }}
                            className="h-full w-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="h-full w-full items-center justify-center">
                            <FontAwesome name="cutlery" size={26} color="#a8a8a8" />
                        </View>
                    )}
                    <View className="absolute bottom-1.5 right-1.5">
                        {quantity > 0 ? (
                            <View className="flex-row items-center overflow-hidden rounded-full bg-[#f5861f]">
                                <TouchableOpacity
                                    onPress={() => onRemove?.(item)}
                                    className="px-2 py-1.5"
                                    accessibilityRole="button"
                                    accessibilityLabel="Decrease quantity"
                                >
                                    <Text className="font-josefin-bold text-[12px] text-white">
                                        −
                                    </Text>
                                </TouchableOpacity>
                                <Text className="min-w-[18px] text-center font-josefin-bold text-[12px] text-white">
                                    {quantity}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => onAdd?.(item)}
                                    className="px-2 py-1.5"
                                    accessibilityRole="button"
                                    accessibilityLabel="Increase quantity"
                                >
                                    <Text className="font-josefin-bold text-[12px] text-white">
                                        +
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => onAdd?.(item)}
                                className="h-9 w-9 items-center justify-center rounded-full bg-[#f5861f] shadow-md"
                                accessibilityRole="button"
                                accessibilityLabel={`Add ${item.name}`}
                            >
                                <Plus size={18} color="#ffffff" strokeWidth={2.6} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View className="p-2.5">
                    <Text
                        className="font-josefin-bold text-[12px] leading-[15px] text-[#2c2c2c]"
                        numberOfLines={2}
                    >
                        {item.name}
                    </Text>
                    <View className="mt-1 flex-row flex-wrap items-center justify-between gap-1">
                        <Text className="font-josefin-bold text-[11px] text-[#434343]">
                            {priceLabel}
                        </Text>
                        <LikeRow item={item} />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-row items-start gap-3 rounded-2xl border border-[#ececec] bg-white p-3">
            <View className="h-20 w-20 overflow-hidden rounded-xl bg-[#f0f0f0]">
                {item.imageUri ? (
                    <Image
                        source={{ uri: item.imageUri }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="flex-1 items-center justify-center">
                        <FontAwesome name="cutlery" size={22} color="#a8a8a8" />
                    </View>
                )}
            </View>

            <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text
                        className="font-josefin-bold text-[14px] text-[#2c2c2c]"
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    {item.tags?.map((tag) => (
                        <View
                            key={tag}
                            className="rounded-full bg-[#fff1e2] px-2 py-0.5"
                        >
                            <Text className="font-josefin-bold text-[9px] text-[#f5861f]">
                                {tag.toUpperCase()}
                            </Text>
                        </View>
                    ))}
                </View>

                <Text
                    className="mt-1 font-josefin text-[11px] leading-[15px] text-[#777]"
                    numberOfLines={2}
                >
                    {item.description}
                </Text>

                <View className="mt-2 flex-row flex-wrap items-center justify-between gap-y-1">
                    <View>
                        <Text className="font-josefin-bold text-[13px] text-[#2c2c2c]">
                            {priceLabel}
                        </Text>
                        <LikeRow item={item} />
                    </View>

                    {quantity > 0 ? (
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                onPress={() => onRemove?.(item)}
                                className="h-7 w-7 items-center justify-center rounded-full border border-[#f5861f]"
                                accessibilityRole="button"
                                accessibilityLabel={`Remove one ${item.name}`}
                            >
                                <FontAwesome
                                    name="minus"
                                    size={10}
                                    color="#f5861f"
                                />
                            </TouchableOpacity>
                            <Text className="min-w-[16px] text-center font-josefin-bold text-[13px] text-[#2c2c2c]">
                                {quantity}
                            </Text>
                            <TouchableOpacity
                                onPress={() => onAdd?.(item)}
                                className="h-7 w-7 items-center justify-center rounded-full bg-[#f5861f]"
                                accessibilityRole="button"
                                accessibilityLabel={`Add one ${item.name}`}
                            >
                                <Plus size={14} color="#ffffff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => onAdd?.(item)}
                            className="flex-row items-center gap-1.5 rounded-full bg-[#f5861f] px-3 py-1.5"
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${item.name}`}
                        >
                            <Plus size={12} color="#ffffff" strokeWidth={2.6} />
                            <Text className="font-josefin-bold text-[11px] text-white">
                                Add
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}
