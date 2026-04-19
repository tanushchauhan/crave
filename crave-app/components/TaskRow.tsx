import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Platform, Pressable, Text } from "react-native";

/** Page background orange — buttons sit slightly richer for contrast */
export const FINISH_SETUP_PAGE_ORANGE = "#FF914D";
export const FINISH_SETUP_BUTTON_ORANGE = "#FF7A2E";
export const FINISH_SETUP_BUTTON_TEXT = "#3D2B1F";

type TaskRowProps = {
    iconName: React.ComponentProps<typeof FontAwesome5>["name"];
    label: string;
    completed?: boolean;
    onPress?: () => void;
};

export default function TaskRow({
    iconName,
    label,
    completed,
    onPress,
}: TaskRowProps) {
    return (
        <Pressable
            onPress={onPress}
            android_ripple={{
                color: "rgba(255,255,255,0.45)",
                borderless: false,
            }}
            className="flex-row items-center overflow-hidden rounded-full border-4 border-white px-5 py-3.5 min-h-[56px]"
            style={({ pressed }) => [
                { backgroundColor: FINISH_SETUP_BUTTON_ORANGE },
                Platform.OS === "ios" && pressed ? { opacity: 0.9 } : null,
            ]}
        >
            <FontAwesome5
                name={iconName}
                size={18}
                solid
                color={FINISH_SETUP_BUTTON_TEXT}
                style={{ marginRight: 14 }}
            />
            <Text
                className="flex-1 font-josefin-bold text-[16px]"
                style={{ color: FINISH_SETUP_BUTTON_TEXT }}
            >
                {label}
            </Text>
            {completed && (
                <FontAwesome5
                    name="check-circle"
                    size={22}
                    solid
                    color="#2e9c45"
                    style={{ marginLeft: 10 }}
                />
            )}
        </Pressable>
    );
}
