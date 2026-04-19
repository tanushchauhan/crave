import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Text, TouchableOpacity } from "react-native";

type FinishButtonProps = {
    label?: string;
    onPress?: () => void;
    disabled?: boolean;
};

export default function FinishButton({
    label = "Finished",
    onPress,
    disabled,
}: FinishButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.85}
            className={`flex-row items-center rounded-full bg-[#f5861f] px-5 py-2.5 ${
                disabled ? "opacity-50" : ""
            }`}
        >
            <Text className="text-white font-bold text-[15px] mr-2">
                {label}
            </Text>
            <FontAwesome name="check" size={14} color="white" />
        </TouchableOpacity>
    );
}
