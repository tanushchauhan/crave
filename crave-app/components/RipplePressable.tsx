import { cn } from "@/lib/utils";
import { type ComponentProps, type ReactNode, useCallback } from "react";
import {
    Pressable,
    type AccessibilityState,
    type LayoutChangeEvent,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

type RipplePressableProps = {
    children: ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    className?: string;
    style?: StyleProp<ViewStyle>;
    /** Clip ripple; use 9999 for circular controls */
    borderRadius?: number;
    onLayout?: (e: LayoutChangeEvent) => void;
    accessibilityRole?: ComponentProps<typeof Pressable>["accessibilityRole"];
    accessibilityState?: AccessibilityState;
    accessibilityLabel?: string;
};

export default function RipplePressable({
    children,
    onPress,
    disabled,
    className,
    style,
    borderRadius = 14,
    onLayout,
    accessibilityRole,
    accessibilityState,
    accessibilityLabel,
}: RipplePressableProps) {
    const ripple = useSharedValue(0);
    const rippleOpacity = useSharedValue(0);

    const rippleStyle = useAnimatedStyle(() => ({
        opacity: rippleOpacity.value,
        transform: [{ scale: ripple.value }],
    }));

    const fireRipple = useCallback(() => {
        ripple.value = 0.25;
        rippleOpacity.value = 0.55;
        ripple.value = withTiming(1.35, {
            duration: 420,
            easing: Easing.out(Easing.cubic),
        });
        rippleOpacity.value = withTiming(0, {
            duration: 420,
            easing: Easing.out(Easing.quad),
        });
    }, [ripple, rippleOpacity]);

    return (
        <Pressable
            disabled={disabled}
            onLayout={onLayout}
            onPress={() => {
                fireRipple();
                onPress?.();
            }}
            accessibilityRole={accessibilityRole}
            accessibilityState={accessibilityState}
            accessibilityLabel={accessibilityLabel}
            className={cn("overflow-hidden", className)}
            style={[
                { borderRadius, opacity: disabled ? 0.45 : 1 },
                style,
            ]}
        >
            {children}
            <Animated.View
                pointerEvents="none"
                style={[
                    {
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        backgroundColor: "rgba(255,255,255,0.92)",
                        borderRadius,
                    },
                    rippleStyle,
                ]}
            />
        </Pressable>
    );
}
