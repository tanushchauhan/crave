import { Text, View } from "react-native";

export default function RecommendationScreenHeader() {
    return (
        <View className="border-b border-[#e5e5e5] pb-3 pt-1 px-4">
            <Text className="font-josefin-bold text-[#ff904b] text-[16px] leading-[20px]">
                Recommendations For Today
            </Text>
        </View>
    );
}
