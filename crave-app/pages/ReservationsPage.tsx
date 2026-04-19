import Waffle from "@/assets/canva/assets/6.svg";
import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import MainAppPageHeader from "@/components/MainAppPageHeader";
import RipplePressable from "@/components/RipplePressable";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { useGroupsSession } from "@/context/GroupsSessionContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
    type BookingListRow,
    bookingSearchText,
    createBookingViaEdge,
    fetchMyBookings,
    fetchPartnerRestaurants,
    formatBookingDateLabel,
    type PartnerRestaurantOption,
    updateDietaryNotes,
} from "@/lib/bookingsApi";
import { pickReceiptDocument } from "@/lib/pickReceipt";
import { supabase } from "@/lib/supabase";
import { Pencil, Search, Settings } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_BG = "#f4f4f4";
const MUTED = "#a6a6a6";
const CARD_BG = "#5a5a5a";
const ORANGE_CTA = "#f5861f";
const RES_ORANGE_CHIP = "#e8894a";

type ReservationsPageProps = {
    activeTab: MainAppTabId;
    onTabChange: (tab: MainAppTabId) => void;
    onVoicePress?: () => void;
};

type ReceiptAttachment = {
    uri: string;
    name: string;
    mimeType?: string | null;
};

type ResSortKey = "latest" | "oldest" | "venue-asc" | "venue-desc";

const RES_SORT_LABELS: Record<ResSortKey, string> = {
    latest: "Latest",
    oldest: "Oldest",
    "venue-asc": "Venue (A–Z)",
    "venue-desc": "Venue (Z–A)",
};

type ResFilterId = "all" | "upcoming" | "past" | "current-group";

const RES_FILTER_LABELS: Record<ResFilterId, string> = {
    all: "All",
    upcoming: "Upcoming",
    past: "Past",
    "current-group": "Current group only",
};

function bookingDate(b: BookingListRow): Date {
    return new Date(b.scheduled_at ?? b.created_at);
}

function isBookingPast(b: BookingListRow): boolean {
    return bookingDate(b).getTime() < Date.now();
}

export default function ReservationsPage({
    activeTab,
    onTabChange,
    onVoicePress,
}: ReservationsPageProps) {
    const insets = useSafeAreaInsets();
    const navHeight = 72;
    const { currentGroup } = useGroupsSession();
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<ResSortKey>("latest");
    const [filterId, setFilterId] = useState<ResFilterId>("all");
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [bookings, setBookings] = useState<BookingListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [newBookingOpen, setNewBookingOpen] = useState(false);

    const loadBookings = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            setCurrentUserId(userData.user?.id ?? null);
            const rows = await fetchMyBookings();
            setBookings(rows);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBookings();
    }, [loadBookings]);

    const currentLabel = currentGroup?.name ?? "No group";

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = bookings;
        if (q) {
            list = list.filter((b) => bookingSearchText(b).includes(q));
        }
        if (filterId === "upcoming") {
            list = list.filter((b) => !isBookingPast(b));
        } else if (filterId === "past") {
            list = list.filter((b) => isBookingPast(b));
        } else if (filterId === "current-group") {
            if (currentGroup?.id) {
                list = list.filter((b) => b.group_id === currentGroup.id);
            } else {
                list = [];
            }
        }
        return list;
    }, [bookings, search, filterId, currentGroup?.id]);

    const visibleBookings = useMemo(() => {
        const list = [...filtered];
        if (sortKey === "latest") {
            return list.sort(
                (a, b) => bookingDate(b).getTime() - bookingDate(a).getTime(),
            );
        }
        if (sortKey === "oldest") {
            return list.sort(
                (a, b) => bookingDate(a).getTime() - bookingDate(b).getTime(),
            );
        }
        const venueOf = (b: BookingListRow) => b.restaurants?.name ?? "Restaurant";
        if (sortKey === "venue-asc") {
            return list.sort((a, b) => venueOf(a).localeCompare(venueOf(b)));
        }
        if (sortKey === "venue-desc") {
            return list.sort((a, b) => venueOf(b).localeCompare(venueOf(a)));
        }
        return list;
    }, [filtered, sortKey]);

    useEffect(() => {
        setExpandedId((cur) =>
            cur && visibleBookings.some((b) => b.id === cur)
                ? cur
                : (visibleBookings[0]?.id ?? null),
        );
    }, [visibleBookings]);

    const toggle = useCallback((id: string) => {
        setExpandedId((cur) => (cur === id ? null : id));
    }, []);

    const filterLabel = RES_FILTER_LABELS[filterId];

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: PAGE_BG }}
            edges={["left", "right"]}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingBottom: insets.bottom + navHeight + 56,
                    paddingHorizontal: 16,
                    paddingTop: 0,
                }}
                showsVerticalScrollIndicator
            >
                <MainAppPageHeader
                    title="Reservation"
                    icon={
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#fff3e7]">
                            <Waffle width={26} height={28} />
                        </View>
                    }
                />

                <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-white px-3 py-2.5">
                    <Search size={16} color={MUTED} strokeWidth={2} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search venue or date…"
                        placeholderTextColor={MUTED}
                        className="flex-1 py-0 font-josefin text-[13px] text-[#2c2c2c]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.88}
                    className="mt-3 self-start rounded-xl bg-[#d9d9d9] px-4 py-2.5"
                    onPress={() => setNewBookingOpen(true)}
                >
                    <Text className="font-josefin-bold text-[11px] text-white">
                        Manage Reservations
                    </Text>
                </TouchableOpacity>

                <View className="mt-3 flex-row flex-wrap gap-2">
                    <TouchableOpacity
                        onPress={() => setSortMenuOpen(true)}
                        activeOpacity={0.88}
                        className="rounded-full border border-white bg-white px-3 py-1.5"
                    >
                        <Text
                            className="font-josefin-bold text-[11px]"
                            style={{ color: MUTED }}
                        >
                            Sort By: {RES_SORT_LABELS[sortKey]}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilterMenuOpen(true)}
                        activeOpacity={0.88}
                        className="rounded-full border border-white bg-white px-3 py-1.5"
                    >
                        <Text
                            className="font-josefin-bold text-[11px]"
                            style={{ color: MUTED }}
                        >
                            Filter: {filterLabel}
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="mt-10 items-center py-8">
                        <ActivityIndicator size="large" color={ORANGE_CTA} />
                        <Text className="mt-3 font-josefin text-[14px] text-[#888]">
                            Loading reservations…
                        </Text>
                    </View>
                ) : error ? (
                    <View className="mt-4 rounded-2xl bg-[#fff3e8] px-4 py-4">
                        <Text className="font-josefin-bold text-[15px] text-[#c45a00]">
                            Could not load reservations
                        </Text>
                        <Text className="mt-2 font-josefin text-[13px] text-[#666]">
                            {error}
                        </Text>
                        <TouchableOpacity
                            className="mt-3 self-start rounded-full bg-[#f5861f] px-4 py-2"
                            onPress={() => void loadBookings()}
                        >
                            <Text className="font-josefin-bold text-[14px] text-white">
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : visibleBookings.length === 0 ? (
                    <View className="mt-6">
                        <Text className="font-josefin text-[14px] text-[#666]">
                            {bookings.length === 0
                                ? "No reservations yet. Use Manage Reservations to book a partner venue, or run the seed script for demo rows."
                                : "No reservations match your search or filters."}
                        </Text>
                    </View>
                ) : (
                    <View className="mt-5 gap-4">
                        {visibleBookings.map((b) => {
                            const venue = b.restaurants?.name ?? "Restaurant";
                            const dateLabel = formatBookingDateLabel(
                                b.scheduled_at,
                                b.created_at,
                            );
                            const extra = `Party of ${b.party_size}`;
                            const isBooker =
                                currentUserId != null &&
                                b.user_id === currentUserId;
                            return (
                                <ReservationCard
                                    key={b.id}
                                    bookingId={b.id}
                                    venue={venue}
                                    extraMembers={extra}
                                    reservationLabel={dateLabel}
                                    isPast={isBookingPast(b)}
                                    expanded={expandedId === b.id}
                                    onToggle={() => toggle(b.id)}
                                    currentGroupName={currentLabel}
                                    initialDietaryNotes={b.dietary_notes}
                                    isBooker={isBooker}
                                    onReload={() => void loadBookings()}
                                />
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            <NewBookingModal
                visible={newBookingOpen}
                onClose={() => setNewBookingOpen(false)}
                currentGroupId={currentGroup?.id ?? null}
                onCreated={() => void loadBookings()}
            />

            <VoiceAssistantFab
                onPress={onVoicePress}
                style={{ bottom: insets.bottom + navHeight + 8 }}
            />

            <View
                className="absolute bottom-0 left-0 right-0 bg-transparent pt-1"
                style={{ paddingBottom: insets.bottom }}
            >
                <MainAppBottomNav activeTab={activeTab} onTabChange={onTabChange} />
            </View>

            <OptionSheetModal
                visible={sortMenuOpen}
                title="Sort reservations"
                onClose={() => setSortMenuOpen(false)}
                options={(Object.keys(RES_SORT_LABELS) as ResSortKey[]).map(
                    (id) => ({
                        id,
                        label: RES_SORT_LABELS[id],
                    }),
                )}
                selectedId={sortKey}
                onSelect={(id) => {
                    setSortKey(id as ResSortKey);
                    setSortMenuOpen(false);
                }}
            />

            <OptionSheetModal
                visible={filterMenuOpen}
                title="Filter reservations"
                onClose={() => setFilterMenuOpen(false)}
                options={(Object.keys(RES_FILTER_LABELS) as ResFilterId[]).map(
                    (id) => ({
                        id,
                        label: RES_FILTER_LABELS[id],
                    }),
                )}
                selectedId={filterId}
                onSelect={(id) => {
                    setFilterId(id as ResFilterId);
                    setFilterMenuOpen(false);
                }}
            />
        </SafeAreaView>
    );
}

function OptionSheetModal<T extends string>({
    visible,
    title,
    onClose,
    options,
    selectedId,
    onSelect,
}: {
    visible: boolean;
    title: string;
    onClose: () => void;
    options: { id: T; label: string }[];
    selectedId: T;
    onSelect: (id: T) => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 justify-end bg-black/40">
                <Pressable className="flex-1" onPress={onClose} />
                <View className="rounded-t-3xl bg-white px-4 pb-6 pt-3">
                    <Text className="font-josefin-bold text-[15px] text-[#2c2c2c]">
                        {title}
                    </Text>
                    <View className="mt-3 gap-1">
                        {options.map((o) => {
                            const sel = o.id === selectedId;
                            return (
                                <TouchableOpacity
                                    key={o.id}
                                    onPress={() => onSelect(o.id)}
                                    activeOpacity={0.88}
                                    className="flex-row items-center justify-between rounded-xl px-3 py-3"
                                    style={{
                                        backgroundColor: sel ? "#fff3e7" : "#f7f7f7",
                                    }}
                                >
                                    <Text className="font-josefin text-[14px] text-[#333]">
                                        {o.label}
                                    </Text>
                                    {sel ? (
                                        <FontAwesome
                                            name="check"
                                            size={14}
                                            color={ORANGE_CTA}
                                        />
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity
                        onPress={onClose}
                        className="mt-3 items-center rounded-xl bg-[#ececec] py-3"
                    >
                        <Text className="font-josefin-bold text-[13px] text-[#555]">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

type ReservationCardProps = {
    bookingId: string;
    venue: string;
    extraMembers: string;
    reservationLabel: string;
    isPast: boolean;
    expanded: boolean;
    onToggle: () => void;
    currentGroupName: string;
    initialDietaryNotes: string | null;
    isBooker: boolean;
    onReload: () => void;
};

function ReservationCard({
    bookingId,
    venue,
    extraMembers,
    reservationLabel,
    isPast,
    expanded,
    onToggle,
    currentGroupName,
    initialDietaryNotes,
    isBooker,
    onReload,
}: ReservationCardProps) {
    const [instructions, setInstructions] = useState(initialDietaryNotes ?? "");
    const [saving, setSaving] = useState(false);
    const [attachments, setAttachments] = useState<ReceiptAttachment[]>([]);

    useEffect(() => {
        setInstructions(initialDietaryNotes ?? "");
    }, [initialDietaryNotes, bookingId]);

    const addReceipt = useCallback(async () => {
        const picked = await pickReceiptDocument();
        if (!picked) return;
        setAttachments((prev) => [...prev, picked]);
    }, []);

    const saveAndClose = useCallback(async () => {
        if (!isBooker) {
            onToggle();
            return;
        }
        setSaving(true);
        try {
            await updateDietaryNotes(bookingId, instructions);
            onReload();
            onToggle();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Save failed";
            Alert.alert("Could not save", msg);
        } finally {
            setSaving(false);
        }
    }, [bookingId, instructions, isBooker, onReload, onToggle]);

    const isPdf = (a: ReceiptAttachment) =>
        (a.mimeType?.includes("pdf") ?? false) ||
        a.name.toLowerCase().endsWith(".pdf");

    if (!expanded) {
        return (
            <View
                className="overflow-hidden rounded-2xl"
                style={{ backgroundColor: CARD_BG }}
            >
                <TouchableOpacity onPress={onToggle} activeOpacity={0.92}>
                    <View className="flex-row items-center justify-between px-3 py-3">
                        <Text className="font-josefin-bold text-[15px] text-white">
                            {venue}
                        </Text>
                    </View>
                </TouchableOpacity>
                <View className="flex-row flex-wrap items-center gap-2 px-3 pb-3">
                    <View className="min-w-[120px] flex-1 flex-row items-center">
                        <AvatarStack />
                        <Text className="ml-1 font-josefin-bold text-[13px] text-[#f5f5f5]">
                            {extraMembers}
                        </Text>
                    </View>
                    {isPast ? (
                        <RipplePressable
                            borderRadius={8}
                            onPress={addReceipt}
                            className="rounded-lg px-3 py-2"
                            style={{ backgroundColor: ORANGE_CTA }}
                        >
                            <Text className="font-josefin-bold text-[10px] text-white">
                                Upload receipt
                            </Text>
                        </RipplePressable>
                    ) : (
                        <RipplePressable
                            borderRadius={8}
                            onPress={onToggle}
                            className="flex-row items-center gap-1 rounded-lg px-3 py-2"
                            style={{ backgroundColor: "#3a3a3a" }}
                        >
                            <Settings size={12} color="#fff" strokeWidth={2} />
                            <Text className="font-josefin-bold text-[10px] text-white">
                                Settings
                            </Text>
                        </RipplePressable>
                    )}
                    <View
                        className="rounded-lg px-2 py-2"
                        style={{ backgroundColor: RES_ORANGE_CHIP }}
                    >
                        <Text className="font-josefin-bold text-[9px] text-white">
                            Reservation:
                        </Text>
                        <Text className="font-josefin-bold text-[9px] text-white">
                            {reservationLabel}
                        </Text>
                    </View>
                    {attachments.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="w-full"
                            contentContainerStyle={{ gap: 6, paddingTop: 4 }}
                        >
                            {attachments.map((a, i) => (
                                <View
                                    key={`${a.uri}-${i}`}
                                    className="h-12 w-12 overflow-hidden rounded-lg border border-white/30"
                                >
                                    {isPdf(a) ? (
                                        <View className="h-full w-full items-center justify-center bg-white/20">
                                            <FontAwesome name="file-pdf-o" size={16} color="#fff" />
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: a.uri }}
                                            className="h-full w-full"
                                            resizeMode="cover"
                                        />
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    ) : null}
                </View>
            </View>
        );
    }

    return (
        <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: CARD_BG }}>
            <View className="flex-row items-start justify-between px-3 py-3">
                <TouchableOpacity
                    onPress={onToggle}
                    activeOpacity={0.92}
                    className="min-w-0 flex-1 flex-row items-center gap-2 pr-2"
                    accessibilityRole="button"
                    accessibilityLabel="Collapse reservation"
                >
                    <Text className="font-josefin-bold text-[15px] text-white">{venue}</Text>
                    <Pencil size={14} color="#ffffff" strokeWidth={2} />
                </TouchableOpacity>
                <View className="items-end gap-1">
                    {!isPast ? (
                        <View
                            className="flex-row items-center gap-1 rounded-md px-2 py-1.5"
                            style={{ backgroundColor: "#3a3a3a" }}
                        >
                            <Settings size={12} color="#fff" strokeWidth={2} />
                            <Text className="font-josefin-bold text-[10px] text-white">
                                Settings
                            </Text>
                        </View>
                    ) : null}
                    <View
                        className="flex-row items-center gap-1 rounded-md px-2 py-1"
                        style={{ backgroundColor: RES_ORANGE_CHIP }}
                    >
                        <Text className="font-josefin-bold text-[9px] text-white">
                            Reservation:
                        </Text>
                        <Text className="font-josefin-bold text-[9px] text-white">
                            {reservationLabel}
                        </Text>
                    </View>
                </View>
            </View>

            <View
                className="flex-row items-center px-3 py-2"
                style={{ backgroundColor: "#2c2c2c" }}
            >
                <Settings size={14} color="#fff" strokeWidth={2} />
                <Text className="ml-2 font-josefin-bold text-[12px] text-white">Settings</Text>
            </View>

            <View className="bg-[#e8e8e8] px-3 pb-3 pt-2">
                <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center">
                        <AvatarStack />
                        <Text className="ml-1 font-josefin-bold text-[13px] text-[#555]">
                            {extraMembers}
                        </Text>
                    </View>
                    {isPast ? (
                        <RipplePressable
                            borderRadius={8}
                            onPress={addReceipt}
                            className="rounded-lg px-3 py-2"
                            style={{ backgroundColor: ORANGE_CTA }}
                        >
                            <Text className="font-josefin-bold text-[10px] text-white">
                                Upload receipt
                            </Text>
                        </RipplePressable>
                    ) : null}
                </View>

                {isPast && attachments.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mt-2"
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {attachments.map((a, i) => (
                            <View
                                key={`${a.uri}-ex-${i}`}
                                className="h-16 w-16 overflow-hidden rounded-xl border border-[#ddd] bg-white"
                            >
                                {isPdf(a) ? (
                                    <View className="h-full w-full items-center justify-center">
                                        <FontAwesome name="file-pdf-o" size={22} color="#c0392b" />
                                    </View>
                                ) : (
                                    <Image
                                        source={{ uri: a.uri }}
                                        className="h-full w-full"
                                        resizeMode="cover"
                                    />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                ) : null}

                <Text className="mt-3 font-josefin-bold text-[10px] text-[#333]">
                    Special Instructions for the Restaurant
                </Text>
                {!isBooker ? (
                    <Text className="mt-1 font-josefin text-[11px] text-[#666]">
                        Only the person who booked can edit notes (RLS).
                    </Text>
                ) : null}
                <TextInput
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="e.g Whats the occasion?"
                    placeholderTextColor="rgba(0,0,0,0.45)"
                    multiline
                    editable={isBooker}
                    className="mt-1 min-h-[72px] rounded-xl bg-white px-3 py-2 font-josefin text-[12px] text-[#2c2c2c]"
                />

                <View className="mt-3 flex-row items-center justify-between">
                    <View
                        className="self-start rounded-full px-3 py-1.5"
                        style={{ backgroundColor: ORANGE_CTA }}
                    >
                        <Text className="font-josefin-bold text-[9px] text-white">
                            Current group: {currentGroupName}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => void saveAndClose()}
                        disabled={saving}
                        activeOpacity={0.88}
                        className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
                        style={{ backgroundColor: ORANGE_CTA, opacity: saving ? 0.7 : 1 }}
                    >
                        <FontAwesome name="floppy-o" size={14} color="white" />
                        <Text className="font-josefin-bold text-[12px] text-white">
                            {isBooker ? (saving ? "Saving…" : "Save and Close") : "Close"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function AvatarStack() {
    const colors = ["#c4a574", "#8ab8d4", "#d48a8a"];
    return (
        <View className="flex-row items-center pl-1">
            {colors.map((c, i) => (
                <View
                    key={c}
                    className="h-9 w-9 rounded-full border-2 border-white"
                    style={{
                        backgroundColor: c,
                        marginLeft: i === 0 ? 0 : -10,
                    }}
                />
            ))}
        </View>
    );
}

type NewBookingModalProps = {
    visible: boolean;
    onClose: () => void;
    currentGroupId: string | null;
    onCreated: () => void;
};

function NewBookingModal({
    visible,
    onClose,
    currentGroupId,
    onCreated,
}: NewBookingModalProps) {
    const [partners, setPartners] = useState<PartnerRestaurantOption[]>([]);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
    const [partySize, setPartySize] = useState("2");
    const [scheduledAt, setScheduledAt] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitErr, setSubmitErr] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            return;
        }
        let cancelled = false;
        setLoadErr(null);
        setSubmitErr(null);
        void (async () => {
            try {
                const list = await fetchPartnerRestaurants();
                if (!cancelled) {
                    setPartners(list);
                    const first = list[0]?.id ?? null;
                    setSelectedRestaurantId((cur) =>
                        cur && list.some((p) => p.id === cur) ? cur : first,
                    );
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setLoadErr(e instanceof Error ? e.message : "Failed to load venues");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [visible]);

    const submit = useCallback(async () => {
        const rid = selectedRestaurantId;
        if (!rid) {
            setSubmitErr("Pick a restaurant.");
            return;
        }
        const party = Math.round(Number(partySize));
        if (!Number.isFinite(party) || party <= 0) {
            setSubmitErr("Enter a valid party size.");
            return;
        }
        setSubmitting(true);
        setSubmitErr(null);
        try {
            await createBookingViaEdge({
                restaurant_id: rid,
                party_size: party,
                scheduled_at: scheduledAt.trim() ? scheduledAt.trim() : null,
                group_id: currentGroupId,
                dietary_notes: notes.trim() ? notes.trim() : null,
            });
            onCreated();
            onClose();
            setPartySize("2");
            setScheduledAt("");
            setNotes("");
        } catch (e: unknown) {
            setSubmitErr(e instanceof Error ? e.message : "Booking failed");
        } finally {
            setSubmitting(false);
        }
    }, [currentGroupId, notes, partySize, scheduledAt, selectedRestaurantId, onClose, onCreated]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/40">
                <View
                    className="max-h-[85%] rounded-t-3xl bg-white px-4 pb-6 pt-4"
                    style={{ paddingBottom: 24 }}
                >
                    <Text className="font-josefin-bold text-[18px] text-[#2c2c2c]">
                        New reservation
                    </Text>
                    <Text className="mt-1 font-josefin text-[12px] text-[#666]">
                        Partner venues only. Optional time: ISO local e.g. 2026-04-22T19:00:00
                    </Text>

                    {loadErr ? (
                        <Text className="mt-2 font-josefin text-[13px] text-red-600">{loadErr}</Text>
                    ) : null}

                    <Text className="mt-3 font-josefin-bold text-[12px] text-[#333]">Restaurant</Text>
                    <ScrollView className="mt-1 max-h-40" nestedScrollEnabled>
                        {partners.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => setSelectedRestaurantId(p.id)}
                                className="mb-1 rounded-xl border px-3 py-2"
                                style={{
                                    borderColor: selectedRestaurantId === p.id ? ORANGE_CTA : "#ddd",
                                    backgroundColor:
                                        selectedRestaurantId === p.id ? "#fff3e7" : "#fafafa",
                                }}
                            >
                                <Text className="font-josefin text-[14px] text-[#2c2c2c]">
                                    {p.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text className="mt-3 font-josefin-bold text-[12px] text-[#333]">Party size</Text>
                    <TextInput
                        value={partySize}
                        onChangeText={setPartySize}
                        keyboardType="number-pad"
                        className="mt-1 rounded-xl border border-[#ddd] px-3 py-2 font-josefin text-[14px]"
                    />

                    <Text className="mt-3 font-josefin-bold text-[12px] text-[#333]">
                        When (optional)
                    </Text>
                    <TextInput
                        value={scheduledAt}
                        onChangeText={setScheduledAt}
                        placeholder="ISO datetime or leave empty"
                        placeholderTextColor={MUTED}
                        className="mt-1 rounded-xl border border-[#ddd] px-3 py-2 font-josefin text-[14px]"
                    />

                    <Text className="mt-3 font-josefin-bold text-[12px] text-[#333]">
                        Special instructions (optional)
                    </Text>
                    <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        className="mt-1 min-h-[64px] rounded-xl border border-[#ddd] px-3 py-2 font-josefin text-[14px]"
                    />

                    {submitErr ? (
                        <Text className="mt-2 font-josefin text-[13px] text-red-600">{submitErr}</Text>
                    ) : null}

                    <View className="mt-4 flex-row justify-end gap-2">
                        <TouchableOpacity
                            onPress={onClose}
                            className="rounded-full bg-[#eee] px-4 py-2.5"
                        >
                            <Text className="font-josefin-bold text-[14px] text-[#333]">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => void submit()}
                            disabled={submitting || partners.length === 0}
                            className="rounded-full px-4 py-2.5"
                            style={{ backgroundColor: ORANGE_CTA, opacity: submitting ? 0.7 : 1 }}
                        >
                            <Text className="font-josefin-bold text-[14px] text-white">
                                {submitting ? "Booking…" : "Confirm"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
