import Waffle from "@/assets/canva/assets/6.svg";
import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import MainAppPageHeader from "@/components/MainAppPageHeader";
import RipplePressable from "@/components/RipplePressable";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { useGroupsSession } from "@/context/GroupsSessionContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { pickReceiptDocument } from "@/lib/pickReceipt";
import { Pencil, Search, Settings } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
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

type ReservationRow = {
    id: string;
    venue: string;
    extraMembers: string;
    reservationAt: Date;
};

type ResSortKey = "latest" | "oldest" | "venue-asc" | "venue-desc";

const RES_SORT_LABELS: Record<ResSortKey, string> = {
    latest: "Latest",
    oldest: "Oldest",
    "venue-asc": "Venue (A–Z)",
    "venue-desc": "Venue (Z–A)",
};

type ResFilterId = "all" | "upcoming" | "past";

const RES_FILTER_LABELS: Record<ResFilterId, string> = {
    all: "All",
    upcoming: "Upcoming",
    past: "Past",
};

/** Mock reservations — replace with API data. */
const MOCK_RESERVATIONS: ReservationRow[] = [
    {
        id: "r1",
        venue: "Capital Day Grill",
        extraMembers: "+ 3...",
        // Past (before “now” in normal use — fixed date in the past)
        reservationAt: new Date(2024, 3, 16, 19, 30, 0),
    },
    {
        id: "r2",
        venue: "Capital Day Grill",
        extraMembers: "+ 3...",
        reservationAt: new Date(2026, 5, 18, 19, 30, 0),
    },
];

function formatReservationLabel(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${dd}/${mm}/${yy} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function isReservationPast(at: Date): boolean {
    return at.getTime() < Date.now();
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

    const currentLabel = currentGroup?.name ?? "No group";

    const toggleExpand = useCallback((id: string) => {
        setExpandedId((cur) => (cur === id ? null : id));
    }, []);

    const filtered = useMemo(() => {
        let list = MOCK_RESERVATIONS.filter((r) =>
            r.venue.toLowerCase().includes(search.trim().toLowerCase()),
        );
        if (filterId === "upcoming") {
            list = list.filter((r) => !isReservationPast(r.reservationAt));
        } else if (filterId === "past") {
            list = list.filter((r) => isReservationPast(r.reservationAt));
        }
        return list;
    }, [search, filterId]);

    const visibleReservations = useMemo(() => {
        const list = [...filtered];
        if (sortKey === "latest") {
            return list.sort(
                (a, b) => b.reservationAt.getTime() - a.reservationAt.getTime(),
            );
        }
        if (sortKey === "oldest") {
            return list.sort(
                (a, b) => a.reservationAt.getTime() - b.reservationAt.getTime(),
            );
        }
        if (sortKey === "venue-asc") {
            return list.sort((a, b) => a.venue.localeCompare(b.venue));
        }
        if (sortKey === "venue-desc") {
            return list.sort((a, b) => b.venue.localeCompare(a.venue));
        }
        return list;
    }, [filtered, sortKey]);

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
                        placeholder="Search for a group..."
                        placeholderTextColor={MUTED}
                        className="flex-1 py-0 font-josefin text-[13px] text-[#2c2c2c]"
                    />
                </View>

                <TouchableOpacity
                    activeOpacity={0.88}
                    className="mt-3 self-start rounded-xl bg-[#d9d9d9] px-4 py-2.5"
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

                <View className="mt-5 gap-4">
                    {visibleReservations.length === 0 ? (
                        <Text className="text-center font-josefin text-[13px] text-[#888]">
                            No reservations match your search or filters.
                        </Text>
                    ) : (
                        visibleReservations.map((row) => {
                            const label = formatReservationLabel(row.reservationAt);
                            const past = isReservationPast(row.reservationAt);
                            return (
                                <ReservationCard
                                    key={row.id}
                                    venue={row.venue}
                                    extraMembers={row.extraMembers}
                                    reservationLabel={label}
                                    isPast={past}
                                    expanded={expandedId === row.id}
                                    onToggle={() => toggleExpand(row.id)}
                                    currentGroupName={currentLabel}
                                />
                            );
                        })
                    )}
                </View>
            </ScrollView>

            <VoiceAssistantFab
                onPress={onVoicePress ?? (() => {})}
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
                options={(
                    Object.keys(RES_FILTER_LABELS) as ResFilterId[]
                ).map((id) => ({
                    id,
                    label: RES_FILTER_LABELS[id],
                }))}
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
    venue: string;
    extraMembers: string;
    reservationLabel: string;
    isPast: boolean;
    expanded: boolean;
    onToggle: () => void;
    currentGroupName: string;
};

function ReservationCard({
    venue,
    extraMembers,
    reservationLabel,
    isPast,
    expanded,
    onToggle,
    currentGroupName,
}: ReservationCardProps) {
    const [instructions, setInstructions] = useState("");
    const [attachments, setAttachments] = useState<ReceiptAttachment[]>([]);

    const addReceipt = useCallback(async () => {
        const picked = await pickReceiptDocument();
        if (!picked) return;
        setAttachments((prev) => [...prev, picked]);
    }, []);

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
                <TextInput
                    value={instructions}
                    onChangeText={setInstructions}
                    placeholder="e.g Whats the occasion?"
                    placeholderTextColor="rgba(0,0,0,0.45)"
                    multiline
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
                        onPress={onToggle}
                        activeOpacity={0.88}
                        className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
                        style={{ backgroundColor: ORANGE_CTA }}
                    >
                        <FontAwesome name="floppy-o" size={14} color="white" />
                        <Text className="font-josefin-bold text-[12px] text-white">
                            Save and Close
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
