import { cn } from "@/lib/utils";
import { useMapleAgent } from "@/context/MapleAgentContext";
import { Mic, X } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    TouchableOpacity,
    type StyleProp,
    type ViewStyle,
} from "react-native";

type VoiceAssistantFabProps = {
    /** Optional: override the default tap behavior (which toggles the agent). */
    onPress?: () => void;
    className?: string;
    style?: StyleProp<ViewStyle>;
};

const ORANGE = "#f5861f";
const RED = "#cf3a2c";

export default function VoiceAssistantFab({
    onPress,
    className,
    style,
}: VoiceAssistantFabProps) {
    const { toggle, isActive, isSpeaking, isConnected, isAvailable } = useMapleAgent();
    const live = isActive;
    // Spinner only shows before the agent has actually connected for the first
    // time in this session. The SDK's `status` field is unreliable on the
    // WebRTC fallback path, so we use our own `isConnected` flag (set inside
    // `onConnect`).
    const connecting = isActive && !isConnected;

    const handlePress = onPress ?? (() => isAvailable && toggle());

    // Pulse while listening / speaking so the user sees an active session.
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!live) {
            pulse.stopAnimation();
            pulse.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: isSpeaking ? 1.18 : 1.1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [live, isSpeaking, pulse]);

    return (
        <Animated.View
            style={[
                { transform: [{ scale: pulse }] },
                style,
            ]}
            className="absolute right-5"
        >
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={live ? "End voice conversation" : "Talk to Maple"}
                style={{ backgroundColor: live ? RED : ORANGE }}
                className={cn(
                    "h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg shadow-black/30",
                    className,
                )}
            >
                {connecting ? (
                    <ActivityIndicator color="#fff" />
                ) : live ? (
                    <X size={24} color="#ffffff" strokeWidth={2.4} />
                ) : (
                    <Mic size={24} color="#ffffff" strokeWidth={2.2} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}
