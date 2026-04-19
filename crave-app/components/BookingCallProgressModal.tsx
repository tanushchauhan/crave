import { pickReceiptDocument } from "@/lib/pickReceipt";
import { uploadReceiptImageForBooking } from "@/lib/receiptUploadApi";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
    Building2,
    Check,
    ChevronDown,
    ChevronUp,
    MapPin,
    MessageCircle,
    Phone,
    Sparkles,
    Upload,
} from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ORANGE = "#f5861f";
const MUTED_LINE = "#d8d8d8";
const SOLID = "#1a1a1a";

export type CallBookingPhase = "calling" | "booking" | "booked" | "error";

export type BookingCallProgressModalProps = {
    visible: boolean;
    restaurantName: string;
    phase: CallBookingPhase;
    errorMessage: string | null;
    bookingId: string | null;
    reservationSummary: string | null;
    detailLine: string;
    onClose: () => void;
    onViewReservations: () => void;
};

function StepNode({
    done,
    active,
    icon,
}: {
    done: boolean;
    active: boolean;
    icon: ReactNode;
}) {
    const border = done || active ? SOLID : MUTED_LINE;
    const bg = done || active ? SOLID : "#f4f4f4";
    return (
        <View
            className="h-10 w-10 items-center justify-center rounded-full border-2"
            style={{ borderColor: border, backgroundColor: bg }}
        >
            {icon}
        </View>
    );
}

function StepSegment({ filled }: { filled: boolean }) {
    return (
        <View className="mx-1 h-[3px] flex-1 rounded-full" style={{ backgroundColor: filled ? SOLID : MUTED_LINE }} />
    );
}

export default function BookingCallProgressModal({
    visible,
    restaurantName,
    phase,
    errorMessage,
    bookingId,
    reservationSummary,
    detailLine,
    onClose,
    onViewReservations,
}: BookingCallProgressModalProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [receiptBusy, setReceiptBusy] = useState(false);
    const [receiptOk, setReceiptOk] = useState(false);

    useEffect(() => {
        if (!visible) {
            setDetailsOpen(false);
            setReceiptBusy(false);
            setReceiptOk(false);
        }
    }, [visible]);

    const stepIndex = useMemo(() => {
        if (phase === "calling") return 1;
        if (phase === "booking") return 2;
        if (phase === "booked") return 3;
        if (phase === "error") return 1;
        return 0;
    }, [phase]);

    const title = useMemo(() => {
        if (phase === "calling") return "AI is calling";
        if (phase === "booking") return "Confirming your table";
        if (phase === "booked") return "Booked";
        if (phase === "error") return "Couldn’t complete booking";
        return "Starting…";
    }, [phase]);

    const subtitle = useMemo(() => {
        if (phase === "error") return errorMessage ?? "Something went wrong.";
        if (phase === "booked") return reservationSummary ?? "Added to your reservations.";
        if (phase === "booking") return "Locking this in with the venue…";
        return reservationSummary ?? "Our assistant is placing the call now.";
    }, [phase, errorMessage, reservationSummary]);

    const onUploadReceipt = useCallback(async () => {
        if (!bookingId) {
            Alert.alert("Not ready yet", "Wait until the booking is confirmed.");
            return;
        }
        const picked = await pickReceiptDocument();
        if (!picked) return;
        const mt = picked.mimeType?.toLowerCase() ?? "";
        if (mt.includes("pdf")) {
            Alert.alert(
                "Images only",
                "For automatic line-item extraction, upload a photo of the receipt (JPEG, PNG, or WebP).",
            );
            return;
        }
        setReceiptBusy(true);
        try {
            await uploadReceiptImageForBooking({
                bookingId,
                localFileUri: picked.uri,
                mimeType: picked.mimeType,
            });
            setReceiptOk(true);
            Alert.alert(
                "Receipt uploaded",
                "We’ll parse the receipt for bill splitting. Open Reservations when you’re ready to assign items to your group.",
            );
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Upload failed";
            Alert.alert("Upload failed", msg);
        } finally {
            setReceiptBusy(false);
        }
    }, [bookingId]);

    const canUploadReceipt = phase === "booked" && bookingId != null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
                <View className="flex-1">
                    <View className="absolute left-3 top-2 z-10">
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={12}
                            className="h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm"
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <FontAwesome name="close" size={18} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Map-style header (static placeholder — matches delivery-tracker metaphor) */}
                    <View className="h-[38%] min-h-[200px] bg-[#e6e2dc]">
                        <View className="flex-1 items-center justify-center px-6">
                            <View className="absolute left-[18%] top-[32%] h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
                                <Building2 size={20} color="#333" strokeWidth={2} />
                            </View>
                            <View className="absolute right-[22%] top-[48%] h-11 w-11 items-center justify-center rounded-full bg-white shadow-md">
                                <MapPin size={20} color={ORANGE} strokeWidth={2} />
                            </View>
                            <View className="absolute left-[40%] top-[58%] h-10 w-10 items-center justify-center rounded-full bg-[#c41e3a] shadow-md">
                                <Sparkles size={18} color="#fff" strokeWidth={2} />
                            </View>
                            <Text className="mt-24 text-center font-josefin text-[11px] text-black/45">
                                Live map preview is coming soon — your booking status is below.
                            </Text>
                        </View>
                    </View>

                    <View className="flex-1 rounded-t-3xl bg-white shadow-lg shadow-black/10" style={{ marginTop: -18 }}>
                        <ScrollView
                            className="flex-1 px-5 pt-5"
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text className="font-josefin-bold text-[22px] text-[#1a1a1a]">{title}</Text>
                            <Text className="mt-1 font-josefin text-[13px] leading-[18px] text-[#666]">
                                {subtitle}
                            </Text>

                            <View className="mt-5 flex-row items-center px-1">
                                <StepNode
                                    done={stepIndex >= 1}
                                    active={phase === "calling"}
                                    icon={
                                        <Phone
                                            size={16}
                                            color={stepIndex >= 1 ? "#fff" : "#999"}
                                            strokeWidth={2.2}
                                        />
                                    }
                                />
                                <StepSegment filled={stepIndex >= 2} />
                                <StepNode
                                    done={stepIndex >= 2}
                                    active={phase === "booking"}
                                    icon={<Sparkles size={16} color={stepIndex >= 2 ? "#fff" : "#999"} strokeWidth={2.2} />}
                                />
                                <StepSegment filled={stepIndex >= 3} />
                                <StepNode
                                    done={stepIndex >= 3}
                                    active={phase === "booked"}
                                    icon={<Check size={18} color={stepIndex >= 3 ? "#fff" : "#bbb"} strokeWidth={2.6} />}
                                />
                            </View>

                            <Text className="mt-4 font-josefin text-[13px] leading-[19px] text-[#444]">{detailLine}</Text>

                            <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-[#f6f6f6] px-3 py-3">
                                <View className="min-w-0 flex-1 pr-2">
                                    <Text className="font-josefin-bold text-[11px] uppercase tracking-wide text-[#888]">
                                        CRAVE assistant
                                    </Text>
                                    <Text className="font-josefin-bold text-[15px] text-[#222]">Maple</Text>
                                    <Text className="mt-0.5 font-josefin text-[11px] text-[#777]" numberOfLines={2}>
                                        Handles the call and reservation handoff.
                                    </Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <View className="h-11 w-11 items-center justify-center rounded-full bg-[#e8e8e8]">
                                        <Phone size={18} color="#999" strokeWidth={2.2} />
                                    </View>
                                    <View className="h-11 w-11 items-center justify-center rounded-full bg-[#e8e8e8]">
                                        <MessageCircle size={18} color="#999" strokeWidth={2.2} />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => void onUploadReceipt()}
                                        disabled={!canUploadReceipt || receiptBusy}
                                        className="h-11 w-11 items-center justify-center rounded-full"
                                        style={{
                                            backgroundColor: receiptOk ? "#e8f5e9" : ORANGE,
                                            opacity: !canUploadReceipt || receiptBusy ? 0.45 : 1,
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Upload receipt for bill splitting"
                                    >
                                        {receiptBusy ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : receiptOk ? (
                                            <Check size={18} color="#2e7d32" strokeWidth={2.4} />
                                        ) : (
                                            <Upload size={18} color="#fff" strokeWidth={2.2} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Pressable
                                onPress={() => setDetailsOpen((o) => !o)}
                                className="mt-4 flex-row items-center justify-center gap-1 py-2"
                            >
                                <Text className="font-josefin-bold text-[12px] text-[#555]">
                                    {detailsOpen ? "Hide details" : "View all details"}
                                </Text>
                                {detailsOpen ? (
                                    <ChevronUp size={16} color="#555" strokeWidth={2} />
                                ) : (
                                    <ChevronDown size={16} color="#555" strokeWidth={2} />
                                )}
                            </Pressable>

                            {detailsOpen ? (
                                <View className="mb-4 rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3">
                                    <Text className="font-josefin-bold text-[12px] text-[#333]">Venue</Text>
                                    <Text className="font-josefin text-[12px] text-[#555]">{restaurantName}</Text>
                                    {bookingId ? (
                                        <>
                                            <Text className="mt-2 font-josefin-bold text-[12px] text-[#333]">
                                                Booking id
                                            </Text>
                                            <Text
                                                className="font-josefin text-[11px] text-[#666]"
                                                selectable
                                            >
                                                {bookingId}
                                            </Text>
                                        </>
                                    ) : null}
                                    <Text className="mt-2 font-josefin text-[11px] leading-[16px] text-[#777]">
                                        Receipts upload to secure storage and run through OCR for line items. Assign
                                        dishes to group members from Reservations after processing.
                                    </Text>
                                </View>
                            ) : null}

                            {phase === "booked" ? (
                                <TouchableOpacity
                                    onPress={onViewReservations}
                                    activeOpacity={0.88}
                                    className="mb-8 mt-2 items-center rounded-2xl py-3.5"
                                    style={{ backgroundColor: ORANGE }}
                                >
                                    <Text className="font-josefin-bold text-[14px] text-white">View in Reservations</Text>
                                </TouchableOpacity>
                            ) : phase === "error" ? (
                                <TouchableOpacity
                                    onPress={onClose}
                                    activeOpacity={0.88}
                                    className="mb-8 mt-2 items-center rounded-2xl bg-[#eee] py-3.5"
                                >
                                    <Text className="font-josefin-bold text-[14px] text-[#333]">Close</Text>
                                </TouchableOpacity>
                            ) : (
                                <View className="mb-8 mt-2 flex-row items-center justify-center gap-2 py-2">
                                    <ActivityIndicator color={ORANGE} />
                                    <Text className="font-josefin text-[12px] text-[#888]">Working on it…</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
