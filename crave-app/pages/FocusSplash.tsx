import Logo from "@/assets/canva/assets/logo.svg";
import AnimatedCookingDots from "@/components/AnimatedCookingDots";
import { Text, View } from "react-native";

export default function FocusSplash() {
    return (
        <View className="flex-1 flex-col items-center justify-center bg-white">
            <View className="flex-1 items-center justify-center">
                <View style={{ width: 240, height: 240 }}>
                    <Logo width="100%" height="100%" />
                </View>
            </View>

            <View
                style={{
                    position: "absolute",
                    bottom: 140,
                    left: 0,
                    right: 0,
                    alignItems: "center",
                }}
            >
                <Text className="text-[#f5861f] text-xl font-josefin-bold tracking-wide">
                    Cooking...
                </Text>
                <View style={{ marginTop: 12 }}>
                    <AnimatedCookingDots />
                </View>
            </View>
        </View>
    );
}
