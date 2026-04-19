import Waffle from "@/assets/canva/assets/6.svg";
import AnimatedCookingDots from "@/components/AnimatedCookingDots";
import LayeredTitle from "@/components/LayeredTitle";
import { useUserSettings } from "@/context/UserSettingsContext";
import { postMapleVoiceSetupChunk } from "@/lib/mapleVoiceApi";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio, InterruptionModeIOS } from "expo-av";
import { readAsStringAsync } from "expo-file-system/legacy";
import { Mic } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
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
const MUTED = "#6b6b6b";

/** Long enough for a phrase; server runs Transcribe + Bedrock (~10–60s). */
const CHUNK_MS = 9000;

type SessionLogRow = { id: number; kind: "saved" | "error"; text: string };

type FinishSetupTalkToVoiceProps = {
    onFinished?: () => void;
};

async function releaseIOSRecordingSession() {
    if (Platform.OS !== "ios") return;
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        });
    } catch {
        /* ignore */
    }
}

export default function FinishSetupTalkToVoice({
    onFinished,
}: FinishSetupTalkToVoiceProps) {
    const insets = useSafeAreaInsets();
    const { appendMapleLines, settings, updateSettings } = useUserSettings();
    const [listening, setListening] = useState(false);
    const [sessionLog, setSessionLog] = useState<SessionLogRow[]>([]);
    const [micError, setMicError] = useState<string | null>(null);
    const [uploadBusy, setUploadBusy] = useState(false);

    const listeningRef = useRef(false);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mapleNotesRef = useRef(settings.mapleNotes);
    mapleNotesRef.current = settings.mapleNotes;
    const sessionPreferenceLinesRef = useRef<string[]>([]);
    const logIdRef = useRef(0);

    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        sessionPreferenceLinesRef.current = [];
    }, []);

    useEffect(() => {
        return () => {
            void releaseIOSRecordingSession();
        };
    }, []);

    const clearChunkTimer = useCallback(() => {
        if (chunkTimerRef.current) {
            clearTimeout(chunkTimerRef.current);
            chunkTimerRef.current = null;
        }
    }, []);

    const stopActiveRecording = useCallback(async () => {
        clearChunkTimer();
        const r = recordingRef.current;
        recordingRef.current = null;
        if (!r) {
            return null;
        }
        try {
            await r.stopAndUnloadAsync();
            return r.getURI();
        } catch {
            return null;
        }
    }, [clearChunkTimer]);

    const appendLogRows = useCallback((rows: SessionLogRow[]) => {
        if (rows.length === 0) return;
        setSessionLog((prev) => [...prev, ...rows]);
    }, []);

    const processAudioUri = useCallback(
        async (uri: string) => {
            setUploadBusy(true);
            try {
                const b64 = await readAsStringAsync(uri, {
                    encoding: "base64",
                });
                const fmt = Platform.OS === "ios" ? "m4a" : "m4a";
                const { lines } = await postMapleVoiceSetupChunk({
                    audioBase64: b64,
                    mediaFormat: fmt,
                    existingNotes: mapleNotesRef.current,
                });
                if (lines.length > 0) {
                    appendMapleLines(lines);
                    for (const line of lines) {
                        const t = String(line).trim();
                        if (t) sessionPreferenceLinesRef.current.push(t);
                    }
                    const newRows: SessionLogRow[] = lines
                        .map((l) => String(l).trim())
                        .filter(Boolean)
                        .map((text) => {
                            logIdRef.current += 1;
                            return { id: logIdRef.current, kind: "saved" as const, text };
                        });
                    appendLogRows(newRows);
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Request failed";
                logIdRef.current += 1;
                appendLogRows([{ id: logIdRef.current, kind: "error", text: msg }]);
            } finally {
                setUploadBusy(false);
            }
        },
        [appendMapleLines, appendLogRows],
    );

    const scheduleNextChunk = useCallback(() => {
        clearChunkTimer();
        chunkTimerRef.current = setTimeout(() => {
            void flushChunk();
        }, CHUNK_MS);
    }, [clearChunkTimer]);

    const startNewRecording = useCallback(async (): Promise<boolean> => {
        try {
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            recordingRef.current = recording;
            scheduleNextChunk();
            return true;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Could not start recording";
            setMicError(msg);
            return false;
        }
    }, [scheduleNextChunk]);

    const flushChunk = useCallback(async () => {
        if (!listeningRef.current) {
            return;
        }
        const uri = await stopActiveRecording();
        if (uri) {
            await processAudioUri(uri);
        }
        if (!listeningRef.current) {
            return;
        }
        const ok = await startNewRecording();
        if (!ok) {
            setListening(false);
            listeningRef.current = false;
        }
    }, [processAudioUri, startNewRecording, stopActiveRecording]);

    useEffect(() => {
        listeningRef.current = listening;
    }, [listening]);

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
        if (!listening) {
            return;
        }

        let cancelled = false;

        void (async () => {
            setMicError(null);
            const perm = await Audio.requestPermissionsAsync();
            if (!perm.granted) {
                if (!cancelled) {
                    setMicError("Microphone permission is needed for Maple to listen.");
                    setListening(false);
                }
                return;
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            });
            if (cancelled) {
                return;
            }
            const ok = await startNewRecording();
            if (!ok && !cancelled) {
                setListening(false);
                listeningRef.current = false;
            }
        })();

        return () => {
            cancelled = true;
            clearChunkTimer();
        };
    }, [listening, clearChunkTimer, startNewRecording]);

    useEffect(() => {
        if (listening) {
            return undefined;
        }
        let cancelled = false;
        void (async () => {
            clearChunkTimer();
            const uri = await stopActiveRecording();
            if (cancelled || !uri) {
                return;
            }
            await processAudioUri(uri);
        })();
        return () => {
            cancelled = true;
        };
    }, [listening, clearChunkTimer, stopActiveRecording, processAudioUri]);

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

    const handleFinished = useCallback(async () => {
        listeningRef.current = false;
        setListening(false);
        clearChunkTimer();
        const uri = await stopActiveRecording();
        if (uri) {
            await processAudioUri(uri);
        }

        const preferenceLines = [...sessionPreferenceLinesRef.current];
        updateSettings({
            mapleVoiceLastContext: {
                finishedAt: new Date().toISOString(),
                preferenceLines,
            },
        });

        await releaseIOSRecordingSession();
        setSessionLog([]);
        onFinished?.();
    }, [clearChunkTimer, onFinished, processAudioUri, stopActiveRecording, updateSettings]);

    return (
        <View className="flex-1 bg-white">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingTop: Math.max(insets.top, 16) + 8,
                    paddingHorizontal: 22,
                    paddingBottom: 132,
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

                {micError ? (
                    <View className="mt-4 rounded-xl bg-red-50 px-3 py-2.5">
                        <Text className="text-center font-josefin text-[13px] text-red-700">
                            {micError}
                        </Text>
                    </View>
                ) : null}

                <Text className="mt-5 text-center font-josefin text-[14px] leading-[21px] text-[#444]">
                    Tap Maple to speak. Every few seconds we send your clip to Maple—new
                    preferences are saved automatically to Maple&apos;s Notes.
                </Text>

                <View className="mt-6 items-center">
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
                                    setListening((v) => !v);
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
                                    style={{ opacity: listening ? 1 : 0.88 }}
                                >
                                    <Mic size={20} color="#ffffff" strokeWidth={2.4} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <View className="mt-5 min-h-[28px] items-center justify-center">
                        {listening ? (
                            <View className="flex-row items-center gap-3">
                                <AnimatedCookingDots
                                    color={FINISHED_ORANGE}
                                    dotSize={7}
                                    gap={5}
                                />
                                <Text className="font-josefin-bold text-[15px] text-[#2c2c2c]">
                                    {uploadBusy ? "Saving…" : "Listening"}
                                </Text>
                                {uploadBusy ? (
                                    <ActivityIndicator size="small" color={FINISHED_ORANGE} />
                                ) : null}
                            </View>
                        ) : (
                            <Text className="font-josefin text-[13px]" style={{ color: MUTED }}>
                                Paused — tap Maple when you are ready
                            </Text>
                        )}
                    </View>
                </View>

                <View className="mt-8 rounded-2xl border border-[#ececec] bg-[#fafafa] px-4 py-4">
                    <Text className="font-josefin-bold text-[14px] text-[#2c2c2c]">
                        This session
                    </Text>
                    <Text className="mt-1 font-josefin text-[12px] leading-[18px]" style={{ color: MUTED }}>
                        New lines show up here as Maple processes each clip.
                    </Text>
                    <View className="mt-3 gap-2.5">
                        {sessionLog.length === 0 ? (
                            <Text className="font-josefin-italic text-[12px] text-[#aaa]">
                                Nothing yet — start talking to Maple.
                            </Text>
                        ) : (
                            sessionLog.map((row) => (
                                <View key={row.id} className="flex-row gap-2.5">
                                    <Text
                                        className="mt-0.5 font-josefin-bold text-[11px]"
                                        style={{
                                            color: row.kind === "error" ? "#dc2626" : FINISHED_ORANGE,
                                        }}
                                    >
                                        {row.kind === "error" ? "!" : "\u2022"}
                                    </Text>
                                    <Text
                                        className="flex-1 font-josefin text-[13px] leading-[19px]"
                                        style={{
                                            color: row.kind === "error" ? "#b91c1c" : "#333",
                                        }}
                                    >
                                        {row.text}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 border-t border-[#ececec] bg-white/95 px-5 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 14) }}
            >
                <Pressable
                    onPress={() => void handleFinished()}
                    disabled={uploadBusy}
                    className="flex-row items-center justify-center gap-2 rounded-full py-3.5"
                    style={{
                        backgroundColor: FINISHED_ORANGE,
                        opacity: uploadBusy ? 0.65 : 1,
                    }}
                >
                    {uploadBusy ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <FontAwesome name="check" size={18} color="white" />
                    )}
                    <Text className="font-josefin-bold text-[16px] text-white">
                        {uploadBusy ? "Saving…" : "Finished"}
                    </Text>
                </Pressable>
                <Text className="mt-2.5 text-center font-josefin text-[11px] leading-[16px]" style={{ color: MUTED }}>
                    Finished saves a short summary in Settings under Maple&apos;s notes. Your
                    preferences are already stored after each clip.
                </Text>
            </View>
        </View>
    );
}
