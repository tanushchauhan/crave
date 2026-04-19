import { LucideIcon, Lightbulb } from "lucide-react-native";
import { Text, View } from "react-native";

type CalloutProps = {
    text: string;
    icon?: LucideIcon;
    iconColor?: string;
};

export default function Callout({
    text,
    icon: Icon = Lightbulb,
    iconColor = "#f5c518",
}: CalloutProps) {
    return (
        <View className="rounded-2xl bg-[#d8d8d8] px-4 py-5 flex-row items-start">
            <Icon
                size={28}
                color={iconColor}
                style={{ marginTop: 2, marginRight: 12 }}
            />
            <Text className="flex-1 text-[16px] font-josefin-bold leading-6 text-[#555555]">
                {text}
            </Text>
        </View>
    );
}
