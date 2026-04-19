import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type FoodCuisineCardProps = {
    title: string;
    subtitle: string;
    selected?: boolean;
    rejected?: boolean;
    image?: ReactNode;
    onPress?: () => void;
};

export default function FoodCuisineCard({
    title,
    subtitle,
    selected,
    rejected,
    image,
    onPress,
}: FoodCuisineCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            className="w-[48%] aspect-[0.95] rounded-2xl bg-[#e9e9e9] overflow-hidden border border-[#dcdcdc]"
        >
            <View className="flex-1 items-center justify-center">{image}</View>

            {rejected && (
                <View
                    pointerEvents="none"
                    className="absolute inset-0 bg-[rgba(255,255,255,0.55)]"
                    style={{
                        backgroundColor: "rgba(255,255,255,0.45)",
                    }}
                />
            )}

            <View className="absolute inset-x-0 bottom-0 bg-[rgba(0,0,0,0.35)] px-3 py-2">
                <Text className="text-white text-[13px] font-bold">
                    {title}
                </Text>
                <Text className="text-white/80 text-[10px]">{subtitle}</Text>
            </View>

            {selected && (
                <View className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#3ab54a] items-center justify-center">
                    <FontAwesome name="check" size={14} color="white" />
                </View>
            )}
            {rejected && (
                <View className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#c4c4c4] items-center justify-center">
                    <FontAwesome name="close" size={14} color="white" />
                </View>
            )}
        </TouchableOpacity>
    );
}
