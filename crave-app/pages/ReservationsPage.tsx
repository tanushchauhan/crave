import Waffle from "@/assets/canva/assets/6.svg";
import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import RipplePressable from "@/components/RipplePressable";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { useGroupsSession } from "@/context/GroupsSessionContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { pickReceiptDocument } from "@/lib/pickReceipt";
import { Pencil, Search, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_BG = "#f4f4f4";
const TITLE_ORANGE = "#ff904b";
const MUTED = "#a6a6a6";
const CARD_BG = "#5a5a5a";
const ORANGE_CTA = "#f5861f";
const RES_ORANGE_CHIP = "#e8894a";

type ReservationsPageProps = {
    activeTab: MainAppTabId;
    onTabChange: (tab: MainAppTabId) => void;
    onVoicePress?: () => void;
};

type CardKey = "top" | "bottom" | null;

type ReceiptAttachment = {
    uri: string;
    name: string;
    mimeType?: string | null;
};

export default function ReservationsPage({
    activeTab,
    onTabChange,
    onVoicePress,
}: ReservationsPageProps) {
    const insets = useSafeAreaInsets();
    const navHeight = 72;
    const { currentGroup } = useGroupsSession();
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<CardKey>("bottom");

    const toggle = useCallback((key: Exclude<CardKey, null>) => {
        setExpanded((cur) => (cur === key ? null : key));
    }, []);

    const currentLabel = currentGroup?.name ?? "No group";

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: PAGE_BG }}
            edges={["top", "left", "right"]}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingBottom: insets.bottom + navHeight + 56,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                }}
                showsVerticalScrollIndicator
            >
                <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-[#fff3e7]">
                        <Waffle width={26} height={28} />
                    </View>
                    <Text
                        className="font-josefin-bold text-[18px]"
                        style={{ color: TITLE_ORANGE }}
                    >
                        Reservation
                    </Text>
                </View>

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
                    <View className="rounded-full border border-white bg-white px-3 py-1.5">
                        <Text className="font-josefin-bold text-[11px]" style={{ color: MUTED }}>
                            Sort By: Latest
                        </Text>
                    </View>
                    <View className="rounded-full border border-white bg-white px-3 py-1.5">
                        <Text className="font-josefin-bold text-[11px]" style={{ color: MUTED }}>
                            Filter By: None
                        </Text>
                    </View>
                </View>

                <View className="mt-5 gap-4">
                    <ReservationCard
                        venue="Capital Day Grill"
                        extraMembers="+ 3..."
                        reservationLabel="16/05/26 07:30 PM"
                        expanded={expanded === "top"}
                        onToggle={() => toggle("top")}
                        currentGroupName={currentLabel}
                    />
                    <ReservationCard
                        venue="Capital Day Grill"
                        extraMembers="+ 3..."
                        reservationLabel="18/05/26 07:30 PM"
                        expanded={expanded === "bottom"}
                        onToggle={() => toggle("bottom")}
                        currentGroupName={currentLabel}
                    />
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
        </SafeAreaView>
    );
}

type ReservationCardProps = {
    venue: string;
    extraMembers: string;
    reservationLabel: string;
    expanded: boolean;
    onToggle: () => void;
    currentGroupName: string;
};

function ReservationCard({
    venue,
    extraMembers,
    reservationLabel,
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
            <View className="flex-row items-center justify-between px-3 py-3">
                <View className="flex-1 flex-row items-center gap-2">
                    <Text className="font-josefin-bold text-[15px] text-white">{venue}</Text>
                    <Pencil size={14} color="#ffffff" strokeWidth={2} />
                </View>
                <View className="items-end gap-1">
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
                </View>

                {attachments.length > 0 ? (
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
