import AnimatedCookingDots from "@/components/AnimatedCookingDots";
import BookingCallProgressModal, {
    type CallBookingPhase,
} from "@/components/BookingCallProgressModal";
import ReservationSchedulePicker, {
    getNextReservationSlot,
} from "@/components/ReservationSchedulePicker";
import type { Restaurant } from "@/constants/orderingMockData";
import { useGroupsSession } from "@/context/GroupsSessionContext";
import { createBookingViaEdge } from "@/lib/bookingsApi";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BookOpen, ChevronDown, Mic, MicOff, Phone } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const ORANGE = "#f5861f";
const ORANGE_TITLE = "#ff751f";
const MUTED = "#a6a6a6";
const TRACK_FALSE = "#d0d0d0";

type OrderNowModalProps = {
    visible: boolean;
    restaurant: Restaurant;
    onClose: () => void;
    onBrowseMenu: (restaurant: Restaurant) => void;
    /** After a successful in-app booking, jump user to the Reservations tab. */
    onNavigateToReservations?: () => void;
};

function formatReservationChip(d: Date): string {
    return d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function OrderNowModal({
    visible,
    restaurant,
    onClose,
    onBrowseMenu,
    onNavigateToReservations,
}: OrderNowModalProps) {
    const { currentGroup } = useGroupsSession();
    const [bookReservation, setBookReservation] = useState(true);
    const [notifyGroup, setNotifyGroup] = useState(false);
    const [orderItems, setOrderItems] = useState(true);
    const [voiceListening, setVoiceListening] = useState(false);
    const [voiceLines, setVoiceLines] = useState<string[]>([]);
    const [reservationSlot, setReservationSlot] = useState<Date>(() =>
        getNextReservationSlot(new Date(), restaurant),
    );
    const [reservationPickerOpen, setReservationPickerOpen] = useState(false);

    const [callFlowVisible, setCallFlowVisible] = useState(false);
    const [callPhase, setCallPhase] = useState<CallBookingPhase>("calling");
    const [callBookingId, setCallBookingId] = useState<string | null>(null);
    const [callError, setCallError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            setCallFlowVisible(false);
            setCallPhase("calling");
            setCallBookingId(null);
            setCallError(null);
            return;
        }
        setReservationSlot(getNextReservationSlot(new Date(), restaurant));
        setReservationPickerOpen(false);
        setCallFlowVisible(false);
        setCallPhase("calling");
        setCallBookingId(null);
        setCallError(null);
        // Use restaurant.id only: the parent often passes a new object reference each render
        // while the modal is open; re-running this effect would clear callFlowVisible and
        // make “Process Via Call” appear to do nothing.
    }, [visible, restaurant.id]);

    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!voiceListening) {
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
                        duration: 1400,
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
        const l2 = makeLoop(pulse2, 700);
        l1.start();
        l2.start();

        return () => {
            l1.stop();
            l2.stop();
        };
    }, [voiceListening, pulse1, pulse2]);

    useEffect(() => {
        if (!voiceListening) return;
        const snippets = [
            "Adding brisket plate…",
            "Noted: extra pickles.",
            "Group prefers mild spice.",
        ];
        let i = 0;
        const id = setInterval(() => {
            setVoiceLines((prev) => [...prev, snippets[i % snippets.length]!]);
            i += 1;
        }, 2200);
        return () => clearInterval(id);
    }, [voiceListening]);

    const pulseStyle = (v: Animated.Value) => ({
        opacity: v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 0],
        }),
        transform: [
            {
                scale: v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.4],
                }),
            },
        ],
    });

    const reservationSummary = useMemo(() => {
        if (!bookReservation) {
            return "Flexible timing — we’ll ask for the soonest table.";
        }
        const a = new Date(reservationSlot);
        const b = new Date(a.getTime() + 10 * 60 * 1000);
        const fmt = (d: Date) =>
            d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return `Target window ${fmt(a)} – ${fmt(b)}`;
    }, [bookReservation, reservationSlot]);

    const detailLine = useMemo(() => {
        const g = currentGroup?.name ? ` for ${currentGroup.name}` : "";
        return `Our assistant is calling ${restaurant.name}${g}. Once you’re booked, upload a receipt photo to run bill splitting for your group.`;
    }, [restaurant.name, currentGroup?.name]);

    const startCallFlow = useCallback(() => {
        setCallError(null);
        setCallBookingId(null);
        setCallPhase("calling");
        setCallFlowVisible(true);
    }, []);

    useEffect(() => {
        if (!callFlowVisible || callPhase !== "calling") return;
        const t = setTimeout(() => setCallPhase("booking"), 2600);
        return () => clearTimeout(t);
    }, [callFlowVisible, callPhase]);

    const voiceLinesRef = useRef(voiceLines);
    voiceLinesRef.current = voiceLines;
    const orderItemsRef = useRef(orderItems);
    orderItemsRef.current = orderItems;

    useEffect(() => {
        if (!callFlowVisible || callPhase !== "booking") return;
        let cancelled = false;
        const noteParts: string[] = [];
        const vl = voiceLinesRef.current;
        if (vl.length) {
            noteParts.push(`Voice notes: ${vl.slice(-6).join(" | ")}`);
        }
        if (orderItemsRef.current) {
            noteParts.push("User requested menu-backed ordering when possible.");
        }
        void (async () => {
            try {
                const partySize = Math.max(1, (currentGroup?.phones?.length ?? 0) + 1);
                const { booking_id } = await createBookingViaEdge({
                    restaurant_id: restaurant.id,
                    party_size: partySize,
                    scheduled_at: bookReservation ? reservationSlot.toISOString() : null,
                    group_id: currentGroup?.id ?? null,
                    dietary_notes: noteParts.length ? noteParts.join("\n") : null,
                });
                if (cancelled) return;
                setCallBookingId(booking_id);
                setCallPhase("booked");
            } catch (e: unknown) {
                if (cancelled) return;
                const raw = e instanceof Error ? e.message : "Booking failed";
                const friendly = /restaurant_not_partner|not_partner/i.test(raw)
                    ? "This restaurant isn’t on CRAVE’s in-app booking network yet. Pick a partner venue from Reservations → + to book."
                    : raw;
                setCallError(friendly);
                setCallPhase("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [
        callFlowVisible,
        callPhase,
        restaurant.id,
        bookReservation,
        reservationSlot,
        currentGroup?.id,
        currentGroup?.phones?.length,
    ]);

    const handleCloseProgress = useCallback(() => {
        const p = callPhase;
        setCallFlowVisible(false);
        if (p === "booked") {
            onClose();
        }
    }, [callPhase, onClose]);

    const handleViewReservations = useCallback(() => {
        setCallFlowVisible(false);
        onClose();
        onNavigateToReservations?.();
    }, [onClose, onNavigateToReservations]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center bg-black/45 px-4">
                <Pressable
                    className="absolute inset-0"
                    onPress={onClose}
                    accessibilityLabel="Dismiss"
                    style={{ zIndex: 0 }}
                />

                <View
                    className="max-h-[88%] overflow-hidden rounded-3xl bg-white shadow-lg shadow-black/30"
                    style={{ zIndex: 1, elevation: 12 }}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        className="px-5 pt-4 pb-5"
                    >
                        <View className="mb-3 flex-row items-center justify-end">
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={12}
                                className="h-8 w-8 items-center justify-center rounded-full bg-[#f2f2f2]"
                                accessibilityRole="button"
                                accessibilityLabel="Close order modal"
                            >
                                <FontAwesome name="close" size={16} color="#444" />
                            </TouchableOpacity>
                        </View>

                        <Text
                            className="font-josefin-bold text-[22px]"
                            style={{ color: ORANGE_TITLE }}
                        >
                            Order Now!
                        </Text>

                        <View className="mt-3 flex-row flex-wrap items-center gap-2">
                            <Text className="font-josefin-bold text-[12px]" style={{ color: MUTED }}>
                                Current Active Group:
                            </Text>
                            <View className="flex-row items-center gap-1.5 rounded-full bg-[#ececec] px-3 py-1.5">
                                <FontAwesome name="users" size={11} color="#666" />
                                <Text className="font-josefin text-[11px] text-[#444]">
                                    {currentGroup?.name ?? "No group selected"}
                                </Text>
                            </View>
                        </View>

                        <ToggleRow
                            label="Book A Reservation"
                            value={bookReservation}
                            onValueChange={(v) => {
                                setBookReservation(v);
                                if (!v) setReservationPickerOpen(false);
                            }}
                            trailing={
                                <TouchableOpacity
                                    onPress={() =>
                                        bookReservation &&
                                        setReservationPickerOpen((o) => !o)
                                    }
                                    disabled={!bookReservation}
                                    activeOpacity={0.85}
                                    className="flex-row items-center gap-1 rounded-lg border border-[#ddd] bg-[#f7f7f7] px-2 py-1"
                                    accessibilityRole="button"
                                    accessibilityLabel="Choose reservation date and time"
                                >
                                    <Text className="font-josefin text-[11px] text-[#666]">
                                        {formatReservationChip(reservationSlot)}
                                    </Text>
                                    <ChevronDown
                                        size={14}
                                        color={MUTED}
                                        strokeWidth={2}
                                        style={{
                                            transform: [
                                                {
                                                    rotate: reservationPickerOpen
                                                        ? "180deg"
                                                        : "0deg",
                                                },
                                            ],
                                        }}
                                    />
                                </TouchableOpacity>
                            }
                        />

                        {bookReservation && reservationPickerOpen ? (
                            <ReservationSchedulePicker
                                restaurant={restaurant}
                                selected={reservationSlot}
                                onChange={setReservationSlot}
                            />
                        ) : null}

                        <ToggleRow
                            label="Notify Group Members"
                            value={notifyGroup}
                            onValueChange={setNotifyGroup}
                        />

                        <ToggleRow
                            label="Order Items"
                            value={orderItems}
                            onValueChange={setOrderItems}
                        />

                        {orderItems ? (
                            <View className="mt-2 border-l-2 border-[#f0f0f0] pl-3">
                                <TouchableOpacity
                                    onPress={() => onBrowseMenu(restaurant)}
                                    activeOpacity={0.85}
                                    className="flex-row items-center justify-between py-2"
                                    accessibilityRole="button"
                                    accessibilityLabel="Browse order items, open menu"
                                >
                                    <Text
                                        className="flex-1 pr-2 font-josefin-bold text-[12px]"
                                        style={{ color: MUTED }}
                                    >
                                        Browse Order Items (Open Menu)
                                    </Text>
                                    <View
                                        className="h-10 w-10 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: ORANGE }}
                                    >
                                        <BookOpen size={18} color="#ffffff" strokeWidth={2.2} />
                                    </View>
                                </TouchableOpacity>
                                <Text className="font-josefin text-[10px] leading-[15px] text-black/50">
                                    If you don&apos;t want the AI to order based on your/your
                                    group&apos;s preferences. The AI will show you your order before
                                    processing. You can select items based off the menu.
                                </Text>

                                <View className="mt-4 border-t border-[#f0f0f0] pt-3">
                                    <Text
                                        className="font-josefin-bold text-[12px]"
                                        style={{ color: MUTED }}
                                    >
                                        Talk To Voice Agent
                                    </Text>
                                    <Text className="mt-1 font-josefin text-[10px] leading-[14px] text-black/50">
                                        Talk To Our Voice Agent To Refine Your Order Items.
                                    </Text>

                                    <View className="mt-3 flex-row items-center gap-4">
                                        <View className="h-[72px] w-[72px] items-center justify-center">
                                            <Animated.View
                                                pointerEvents="none"
                                                className="absolute h-[72px] w-[72px] rounded-full bg-[#f5861f]"
                                                style={pulseStyle(pulse1)}
                                            />
                                            <Animated.View
                                                pointerEvents="none"
                                                className="absolute h-[72px] w-[72px] rounded-full bg-[#f5861f]"
                                                style={pulseStyle(pulse2)}
                                            />
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setVoiceListening((v) => {
                                                        if (v) setVoiceLines([]);
                                                        return !v;
                                                    });
                                                }}
                                                activeOpacity={0.88}
                                                className="h-[52px] w-[52px] items-center justify-center rounded-full shadow-md"
                                                style={{
                                                    backgroundColor: ORANGE,
                                                    shadowColor: "#000",
                                                    shadowOpacity: 0.2,
                                                    shadowRadius: 6,
                                                    elevation: 4,
                                                }}
                                                accessibilityRole="button"
                                                accessibilityLabel={
                                                    voiceListening
                                                        ? "Stop voice agent"
                                                        : "Start voice agent"
                                                }
                                            >
                                                {voiceListening ? (
                                                    <Mic size={24} color="#ffffff" strokeWidth={2.4} />
                                                ) : (
                                                    <MicOff size={24} color="#ffffff" strokeWidth={2.4} />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                        <View className="flex-1">
                                            {voiceListening ? (
                                                <View className="flex-row items-center gap-2">
                                                    <AnimatedCookingDots
                                                        color={ORANGE}
                                                        dotSize={6}
                                                        gap={4}
                                                    />
                                                    <Text className="font-josefin-bold text-[12px] text-[#2c2c2c]">
                                                        Listening…
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text className="font-josefin text-[11px] text-[#777]">
                                                    Tap the mic to speak with Maple about this order.
                                                </Text>
                                            )}
                                            {voiceLines.length > 0 ? (
                                                <View className="mt-2 max-h-[72px]">
                                                    {voiceLines.slice(-3).map((line, idx) => (
                                                        <Text
                                                            key={`${voiceLines.length}-${idx}`}
                                                            className="font-josefin text-[10px] text-[#555] leading-[14px]"
                                                            numberOfLines={2}
                                                        >
                                                            • {line}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={startCallFlow}
                            className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
                            style={{ backgroundColor: ORANGE }}
                            accessibilityRole="button"
                            accessibilityLabel="Process booking via AI phone call"
                        >
                            <Phone size={18} color="#ffffff" strokeWidth={2.2} />
                            <Text className="font-josefin-bold text-[13px] text-white">
                                Process Via Call
                            </Text>
                        </TouchableOpacity>

                        <View className="mt-3 items-center justify-center rounded-2xl bg-[#e8e8e8] py-3.5">
                            <Text className="font-josefin-bold text-[12px] text-[#999]">
                                Website-Based Unavailable
                            </Text>
                        </View>
                    </ScrollView>
                </View>

                <BookingCallProgressModal
                    visible={callFlowVisible}
                    restaurantName={restaurant.name}
                    phase={callPhase}
                    errorMessage={callError}
                    bookingId={callBookingId}
                    reservationSummary={reservationSummary}
                    detailLine={detailLine}
                    onClose={handleCloseProgress}
                    onViewReservations={handleViewReservations}
                />
            </View>
        </Modal>
    );
}

function ToggleRow({
    label,
    value,
    onValueChange,
    trailing,
}: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    trailing?: ReactNode;
}) {
    return (
        <View className="mt-4 flex-row items-center justify-between gap-2">
            <Text
                className="flex-1 font-josefin-bold text-[12px]"
                style={{ color: MUTED }}
                numberOfLines={2}
            >
                {label}
            </Text>
            <View className="flex-row items-center gap-2">
                {trailing}
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: TRACK_FALSE, true: ORANGE }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={TRACK_FALSE}
                />
            </View>
        </View>
    );
}
