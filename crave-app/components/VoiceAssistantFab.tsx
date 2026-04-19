import { cn } from "@/lib/utils";
import { Mic } from "lucide-react-native";
import { TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";

type VoiceAssistantFabProps = {
    onPress?: () => void;
    className?: string;
    style?: StyleProp<ViewStyle>;
};

export default function VoiceAssistantFab({
    onPress,
    className,
    style,
}: VoiceAssistantFabProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Voice assistant"
            style={style}
            className={cn(
                "absolute right-5 h-[52px] w-[52px] items-center justify-center rounded-full bg-[#f5861f] shadow-lg shadow-black/30",
                className,
            )}
        >
            <Mic size={24} color="#ffffff" strokeWidth={2.2} />
        </TouchableOpacity>
    );
}
