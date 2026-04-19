import AnimatedCookingDots from "@/components/AnimatedCookingDots";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Mic, MicOff, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type GroupCreationTalkToVoiceProps = {
    onBack?: () => void;
    onFinished?: (transcript: string) => void;
};

const SAMPLE_PROMPTS = [
    "Who are you creating this group with?",
    "What type of food does everyone like?",
    "Any dietary restrictions we should know?",
    "What's the budget per person?",
];

export default function GroupCreationTalkToVoice({
    onBack,
    onFinished,
}: GroupCreationTalkToVoiceProps) {
    const insets = useSafeAreaInsets();
    const [listening, setListening] = useState(true);
    const [promptIndex, setPromptIndex] = useState(0);
    const [transcript, setTranscript] = useState("");

    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;

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
        if (!listening) return;
        const t = setInterval(() => {
            setPromptIndex((i) => (i + 1) % SAMPLE_PROMPTS.length);
        }, 3400);
        return () => clearInterval(t);
    }, [listening]);

    const makePulseStyle = (value: Animated.Value) => ({
        opacity: value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 0],
        }),
        transform: [
            {
                scale: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.2],
                }),
            },
        ],
    });

    return (
        <SafeAreaView
            className="flex-1 bg-[#f5861f]"
            edges={["top", "left", "right", "bottom"]}
        >
            <View className="flex-row items-center justify-between px-4 pt-2">
                <TouchableOpacity
                    onPress={onBack}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <FontAwesome name="arrow-left" size={16} color="white" />
                </TouchableOpacity>
                <Text className="font-josefin-bold text-[14px] text-white tracking-widest">
                    GROUP CREATION
                </Text>
                <TouchableOpacity
                    onPress={onBack}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                >
                    <X size={18} color="#ffffff" strokeWidth={2.4} />
                </TouchableOpacity>
            </View>

            <View className="items-center px-6 pt-6">
                <Text className="font-josefin-bold text-[28px] leading-[34px] text-white text-center">
                    Talk To Voice
                </Text>
                <Text className="mt-2 font-josefin text-[13px] leading-[18px] text-white/90 text-center">
                    Let our assistant listen while you describe your group.
                    Tap the mic any time to pause.
                </Text>
            </View>

            <View className="flex-1 items-center justify-center">
                <View className="h-[220px] w-[220px] items-center justify-center">
                    <Animated.View
                        pointerEvents="none"
                        className="absolute h-[220px] w-[220px] rounded-full bg-white"
                        style={makePulseStyle(pulse1)}
                    />
                    <Animated.View
                        pointerEvents="none"
                        className="absolute h-[220px] w-[220px] rounded-full bg-white"
                        style={makePulseStyle(pulse2)}
                    />

                    <TouchableOpacity
                        onPress={() => setListening((v) => !v)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={
                            listening ? "Pause listening" : "Resume listening"
                        }
                        className="h-[140px] w-[140px] items-center justify-center rounded-full bg-white shadow-lg shadow-black/30"
                    >
                        {listening ? (
                            <Mic size={56} color="#f5861f" strokeWidth={2} />
                        ) : (
                            <MicOff size={56} color="#f5861f" strokeWidth={2} />
                        )}
                    </TouchableOpacity>
                </View>

                <View className="mt-6 h-12 items-center justify-center px-8">
                    {listening ? (
                        <View className="flex-row items-center gap-3">
                            <AnimatedCookingDots
                                color="#ffffff"
                                dotSize={8}
                                gap={6}
                            />
                            <Text className="font-josefin-bold text-[14px] text-white">
                                Listening...
                            </Text>
                        </View>
                    ) : (
                        <Text className="font-josefin-bold text-[14px] text-white/90">
                            Paused · tap the mic to resume
                        </Text>
                    )}
                </View>

                <View className="mt-2 px-8">
                    <Text className="text-center font-josefin text-[15px] leading-[22px] text-white">
                        &ldquo;{SAMPLE_PROMPTS[promptIndex]}&rdquo;
                    </Text>
                </View>
            </View>

            <View
                className="px-5"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
                <View className="rounded-2xl bg-white/15 p-4">
                    <Text className="font-josefin-bold text-[12px] text-white/80 uppercase tracking-widest">
                        Transcript
                    </Text>
                    <Text
                        className="mt-2 font-josefin text-[13px] leading-[18px] text-white"
                        numberOfLines={3}
                    >
                        {transcript.trim().length > 0
                            ? transcript
                            : "Your conversation will appear here as you talk."}
                    </Text>
                </View>

                <View className="mt-3 flex-row gap-3">
                    <TouchableOpacity
                        onPress={() => {
                            setListening(false);
                            setTranscript("");
                        }}
                        className="flex-1 items-center justify-center rounded-full bg-white/20 py-3"
                        accessibilityRole="button"
                        accessibilityLabel="Clear transcript"
                    >
                        <Text className="font-josefin-bold text-[13px] text-white">
                            Reset
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onFinished?.(transcript)}
                        className="flex-1 items-center justify-center rounded-full bg-white py-3"
                        accessibilityRole="button"
                        accessibilityLabel="Finish and create group"
                    >
                        <Text className="font-josefin-bold text-[13px] text-[#f5861f]">
                            Done
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
