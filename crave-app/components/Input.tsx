import { LucideIcon } from "lucide-react-native";
import { TextInput, TextInputProps, View } from "react-native";

type InputProps = TextInputProps & {
    icon?: LucideIcon;
    iconColor?: string;
};

export default function Input({
    icon: Icon,
    iconColor = "#d9d9d9",
    className,
    placeholderTextColor = "#d9d9d9",
    ...textInputProps
}: InputProps) {
    return (
        <View className="flex-row items-center rounded-full bg-white border-4 border-[#d9d9d9] px-4 h-16">
            {Icon && (
                <Icon size={18} color={iconColor} style={{ marginRight: 12 }} />
            )}
            <TextInput
                {...textInputProps}
                placeholderTextColor={placeholderTextColor}
                className={`flex-1 font-josefin-light text-[16px] text-[#333] ${className ?? ""}`}
            />
        </View>
    );
}
