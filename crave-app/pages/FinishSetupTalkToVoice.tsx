import Waffle from "@/assets/canva/assets/6.svg";
import AnimatedCookingDots from "@/components/AnimatedCookingDots";
import LayeredTitle from "@/components/LayeredTitle";
import { useUserSettings } from "@/context/UserSettingsContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Mic } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAPLE_GOLD = "#e6b465";
const MAPLE_SHADOW = "#141c3a";
const FINISHED_ORANGE = "#f5861f";

const NOTE_SAMPLE =
    "Maple's Notes. Maple's Notes. Maple's Notes. Maple's Notes. Maple's Notes. Maple's Notes.";

const LIVE_SNIPPETS = [
    "Heard: you love smoky barbecue notes.",
    "Saved: avoid extra cilantro.",
    "Noted: dinner for four on Friday.",
    "Preference: medium spice only.",
];

type FinishSetupTalkToVoiceProps = {
    onFinished?: () => void;
};

export default function FinishSetupTalkToVoice({
    onFinished,
}: FinishSetupTalkToVoiceProps) {
    const insets = useSafeAreaInsets();
    const { appendMapleLines } = useUserSettings();
    const [listening, setListening] = useState(false);
    const [liveNotes, setLiveNotes] = useState<string[]>([]);
    const snippetIndex = useRef(0);

    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!listening) {
            pulse1.stopAnimation();
            pulse2.stopAnimation();
            return;
        }

        const makeLoop = (value: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(value, {
                        toValue: 1,
                        duration: 1600,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            );

        const l1 = makeLoop(pulse1, 0);
        const l2 = makeLoop(pulse2, 800);
        l1.start();
        l2.start();

        return () => {
            l1.stop();
            l2.stop();
        };
    }, [listening, pulse1, pulse2]);

    useEffect(() => {
        if (!listening) {
            Animated.timing(ringScale, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }).start();
            return;
        }
        const pulseRing = Animated.loop(
            Animated.sequence([
                Animated.timing(ringScale, {
                    toValue: 1.04,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(ringScale, {
                    toValue: 1,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        pulseRing.start();
        return () => pulseRing.stop();
    }, [listening, ringScale]);

    useEffect(() => {
        if (!listening) return;
        const id = setInterval(() => {
            const line = LIVE_SNIPPETS[snippetIndex.current % LIVE_SNIPPETS.length]!;
            snippetIndex.current += 1;
            setLiveNotes((prev) => [...prev, line]);
        }, 2400);
        return () => clearInterval(id);
    }, [listening]);

    const makePulseStyle = (value: Animated.Value) => ({
        opacity: value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.42, 0],
        }),
        transform: [
            {
                scale: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.15],
                }),
            },
        ],
    });

    const handleFinished = () => {
        if (liveNotes.length > 0) {
            appendMapleLines(liveNotes);
        }
        setListening(false);
        setLiveNotes([]);
        onFinished?.();
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: Math.max(insets.top, 16) + 8,
                    paddingHorizontal: 20,
                    paddingBottom: 140,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="items-center">
                    <View className="h-[34px] w-full items-center justify-center">
                        <Text
                            className="absolute font-josefin-bold text-[25px]"
                            style={{
                                color: MAPLE_GOLD,
                                transform: [{ translateX: 2 }, { translateY: 2 }],
                            }}
                        >
                            Click To Talk To
                        </Text>
                        <Text className="font-josefin-bold text-[25px] text-black">
                            Click To Talk To
                        </Text>
                    </View>

                    <View className="mt-1 items-center">
                        <LayeredTitle
                            fontSize={52}
                            fillColor={MAPLE_GOLD}
                            shadowColor={MAPLE_SHADOW}
                        >
                            Maple
                        </LayeredTitle>
                    </View>
                </View>

                <View className="mt-5 items-center">
                    <Text className="mb-3 font-josefin text-[12px] text-[#666] text-center px-2">
                        Tap Maple to start or stop listening. Pulses show when she&apos;s
                        tuned in.
                    </Text>
                    <View className="h-[200px] w-[200px] items-center justify-center">
                        <Animated.View
                            pointerEvents="none"
                            className="absolute h-[196px] w-[196px] self-center rounded-full bg-[#f5861f]"
                            style={makePulseStyle(pulse1)}
                        />
                        <Animated.View
                            pointerEvents="none"
                            className="absolute h-[196px] w-[196px] self-center rounded-full bg-[#f5861f]"
                            style={makePulseStyle(pulse2)}
                        />
                        <Animated.View style={{ transform: [{ scale: ringScale }] }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setListening((v) => {
                                        if (v) {
                                            setLiveNotes([]);
                                            snippetIndex.current = 0;
                                        }
                                        return !v;
                                    });
                                }}
                                activeOpacity={0.92}
                                accessibilityRole="button"
                                accessibilityLabel={
                                    listening ? "Stop listening to Maple" : "Talk to Maple"
                                }
                                className="h-[168px] w-[168px] items-center justify-center rounded-full border-[6px] border-[#3a3a3a] bg-[#f4e4c4] shadow-md shadow-black/20"
                            >
                                <Waffle width={118} height={128} />
                                <View
                                    className="absolute bottom-3 right-5 h-10 w-10 items-center justify-center rounded-full bg-[#f5861f]"
                                    style={{ opacity: listening ? 1 : 0.85 }}
                                >
                                    <Mic size={20} color="#ffffff" strokeWidth={2.4} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <View className="mt-4 h-10 items-center justify-center">
                        {listening ? (
                            <View className="flex-row items-center gap-3">
                                <AnimatedCookingDots
                                    color={FINISHED_ORANGE}
                                    dotSize={7}
                                    gap={5}
                                />
                                <Text className="font-josefin-bold text-[14px] text-[#2c2c2c]">
                                    Listening…
                                </Text>
                            </View>
                        ) : (
                            <Text className="font-josefin text-[12px] text-[#888]">
                                Paused — tap Maple to speak
                            </Text>
                        )}
                    </View>
                </View>

                <View className="mt-8 overflow-hidden rounded-2xl bg-[#ececec] px-3 py-3">
                    <Text className="font-josefin-bold-italic text-[13px] text-black/50">
                        Maple&apos;s Notes
                    </Text>
                    <ScrollView
                        nestedScrollEnabled
                        className="mt-2 max-h-[200px]"
                        showsVerticalScrollIndicator
                    >
                        {liveNotes.map((line, i) => (
                            <View key={`live-${i}`} className="mb-2 flex-row gap-2">
                                <Text className="font-josefin-bold text-[9px] text-[#f5861f]">
                                    {"\u2022"}
                                </Text>
                                <Text className="flex-1 font-josefin-bold text-[9px] leading-[13px] text-[#333]">
                                    {line}
                                </Text>
                            </View>
                        ))}
                        {Array.from({ length: listening ? 3 : 6 }).map((_, i) => (
                            <View key={`base-${i}`} className="mb-2 flex-row gap-2">
                                <Text className="font-josefin-bold text-[7px] text-black/50">
                                    {"\u2022"}
                                </Text>
                                <Text className="flex-1 font-josefin-bold text-[7px] leading-[10px] text-black/50">
                                    {NOTE_SAMPLE}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 border-t border-[#ececec] bg-white px-4 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
                <View className="flex-row items-end justify-between gap-3">
                    <Text className="max-w-[58%] font-josefin-bold text-[8px] leading-[11px] text-black/50">
                        Press Finished When You Are Satisfied With Maple&apos;s Notetaking
                    </Text>
                    <Pressable
                        onPress={handleFinished}
                        className="flex-row items-center gap-2 rounded-full px-5 py-3"
                        style={{ backgroundColor: FINISHED_ORANGE }}
                    >
                        <Text className="font-josefin-bold text-[13px] text-white">
                            Finished
                        </Text>
                        <FontAwesome name="check" size={16} color="white" />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
