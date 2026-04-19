import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, TouchableOpacity, View } from "react-native";

export type SocialPlatform = "instagram" | "facebook" | "youtube" | "snapchat";

type SocialRowProps = {
    platform: SocialPlatform;
    name: string;
    status: string;
    connected: boolean;
    onPress?: () => void;
};

const PLATFORM_META: Record<
    SocialPlatform,
    {
        icon: React.ComponentProps<typeof FontAwesome>["name"];
        iconColor: string;
        iconBg: string;
    }
> = {
    instagram: { icon: "instagram", iconColor: "white", iconBg: "#e1306c" },
    facebook: { icon: "facebook", iconColor: "white", iconBg: "#1877f2" },
    youtube: { icon: "youtube-play", iconColor: "white", iconBg: "#ff0000" },
    snapchat: { icon: "snapchat-ghost", iconColor: "#111", iconBg: "#fffc00" },
};

export default function SocialRow({
    platform,
    name,
    status,
    connected,
    onPress,
}: SocialRowProps) {
    const meta = PLATFORM_META[platform];
    return (
        <View className="flex-row items-center bg-white rounded-2xl border border-[#ececec] px-3 py-3">
            <View
                className="h-9 w-9 items-center justify-center rounded-xl mr-3"
                style={{ backgroundColor: meta.iconBg }}
            >
                <FontAwesome name={meta.icon} size={20} color={meta.iconColor} />
            </View>
            <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#434343]">
                    {name}
                </Text>
                <Text className="text-[11px] text-[#a8a8a8]">{status}</Text>
            </View>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                className={`rounded-full px-4 py-1.5 ${
                    connected ? "bg-[#c4c4c4]" : "bg-[#f5861f]"
                }`}
            >
                <Text className="text-white text-[12px] font-bold">
                    {connected ? "Reconnect" : "Connect"}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
