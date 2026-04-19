import RipplePressable from "@/components/RipplePressable";
import { cn } from "@/lib/utils";
import {
    ClipboardList,
    Home,
    Settings,
    UsersRound,
} from "lucide-react-native";
import { Fragment, useEffect, useRef } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

export type MainAppTabId =
    | "recommendations"
    | "groups"
    | "reservations"
    | "settings";

type MainAppBottomNavProps = {
    activeTab: MainAppTabId;
    onTabChange?: (tab: MainAppTabId) => void;
};

const tabs: {
    id: MainAppTabId;
    label: string;
    Icon: typeof Home;
}[] = [
    { id: "recommendations", label: "Recommendations", Icon: Home },
    { id: "groups", label: "Groups", Icon: UsersRound },
    { id: "reservations", label: "Reservations", Icon: ClipboardList },
    { id: "settings", label: "Settings", Icon: Settings },
];

const SPRING = { damping: 20, stiffness: 200, mass: 0.9 };

export default function MainAppBottomNav({
    activeTab,
    onTabChange,
}: MainAppBottomNavProps) {
    const layouts = useRef<{ x: number; width: number }[]>([
        { x: 0, width: 0 },
        { x: 0, width: 0 },
        { x: 0, width: 0 },
        { x: 0, width: 0 },
    ]);
    const pillX = useSharedValue(0);
    const pillW = useSharedValue(0);

    const activeIndex = Math.max(
        0,
        tabs.findIndex((t) => t.id === activeTab),
    );

    const captureLayout = (index: number) => (e: LayoutChangeEvent) => {
        const { x, width } = e.nativeEvent.layout;
        layouts.current[index] = { x, width };
        if (index === activeIndex && width > 0) {
            pillX.value = withSpring(x, SPRING);
            pillW.value = withSpring(width, SPRING);
        }
    };

    useEffect(() => {
        const L = layouts.current[activeIndex];
        if (L && L.width > 0) {
            pillX.value = withSpring(L.x, SPRING);
            pillW.value = withSpring(L.width, SPRING);
        }
    }, [activeIndex, pillX, pillW]);

    const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pillX.value }],
        width: pillW.value,
    }));

    return (
        <View className="mx-3 mb-2 rounded-[22px] bg-[#3a3a3a] px-0.5 py-2 shadow-black/25 shadow-md">
            <View className="relative flex-row items-stretch">
                <Animated.View
                    pointerEvents="none"
                    className="absolute bottom-1.5 top-1.5 rounded-xl bg-white/18"
                    style={[
                        {
                            left: 0,
                        },
                        pillStyle,
                    ]}
                />
                {tabs.map((tab, index) => {
                    const active = activeTab === tab.id;
                    const Icon = tab.Icon;
                    return (
                        <Fragment key={tab.id}>
                            {index > 0 ? (
                                <View className="my-2 w-px self-stretch border-l border-dashed border-white/50" />
                            ) : null}
                            <RipplePressable
                                borderRadius={14}
                                onPress={() => onTabChange?.(tab.id)}
                                className="min-w-0 flex-1 items-center justify-center gap-1 px-1 py-1.5"
                                onLayout={captureLayout(index)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={tab.label}
                            >
                                <Icon
                                    size={18}
                                    color="#ffffff"
                                    strokeWidth={active ? 2.4 : 2}
                                />
                                <Text
                                    className={cn(
                                        "text-center font-josefin-bold text-[8px] leading-[10px] text-white",
                                    )}
                                    numberOfLines={2}
                                >
                                    {tab.label}
                                </Text>
                            </RipplePressable>
                        </Fragment>
                    );
                })}
            </View>
        </View>
    );
}
