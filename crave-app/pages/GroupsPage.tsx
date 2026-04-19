import Waffle from "@/assets/canva/assets/6.svg";
import AddMemberModal from "@/components/AddMemberModal";
import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import MainAppPageHeader from "@/components/MainAppPageHeader";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import {
    collectGroupTags,
    filterGroupsBySearch,
    type MockGroup,
} from "@/constants/groupsMockData";
import { useGroupsSession } from "@/context/GroupsSessionContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { ChevronDown, Pencil, Search, Settings } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
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

type SortKey = "latest" | "name-asc" | "name-desc" | "members-desc" | "members-asc";

type FilterId =
    | "all"
    | "current"
    | "has-members"
    | "empty"
    | `tag:${string}`;

const SORT_LABELS: Record<SortKey, string> = {
    latest: "Latest",
    "name-asc": "Name (A–Z)",
    "name-desc": "Name (Z–A)",
    "members-desc": "Most members",
    "members-asc": "Fewest members",
};

type GroupsPageProps = {
    activeTab: MainAppTabId;
    onTabChange: (tab: MainAppTabId) => void;
    onVoicePress?: () => void;
    onAddGroup?: () => void;
};

export default function GroupsPage({
    activeTab,
    onTabChange,
    onVoicePress,
    onAddGroup,
}: GroupsPageProps) {
    const insets = useSafeAreaInsets();
    const navHeight = 72;
    const {
        groups,
        groupsLoading,
        groupsError,
        refreshGroups,
        currentGroupId,
        setCurrentGroupId,
        removeMemberPhone,
        renameGroup,
        updateGroupMeta,
    } = useGroupsSession();

    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [settingsDetailGroupId, setSettingsDetailGroupId] = useState<
        string | null
    >(null);
    const [sortKey, setSortKey] = useState<SortKey>("latest");
    const [filterId, setFilterId] = useState<FilterId>("all");
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);

    useEffect(() => {
        if (groups.length === 0) {
            setExpandedId(null);
            setSettingsDetailGroupId(null);
            return;
        }
        setExpandedId((cur) =>
            cur && groups.some((g) => g.id === cur) ? cur : groups[0]!.id,
        );
    }, [groups]);

    const tagList = useMemo(() => collectGroupTags(groups), [groups]);

    const filterOptions = useMemo(() => {
        const base: { id: FilterId; label: string }[] = [
            { id: "all", label: "All groups" },
            { id: "current", label: "Current group only" },
            { id: "has-members", label: "Has saved members" },
            { id: "empty", label: "No members yet" },
        ];
        for (const t of tagList) {
            base.push({ id: `tag:${t}`, label: `Tag: ${t}` });
        }
        return base;
    }, [tagList]);

    const searched = useMemo(
        () => filterGroupsBySearch(groups, search),
        [groups, search],
    );

    const filtered = useMemo(() => {
        let list = searched;
        if (filterId === "current") {
            list = list.filter((g) => g.id === currentGroupId);
        } else if (filterId === "has-members") {
            list = list.filter((g) => g.phones.length > 0);
        } else if (filterId === "empty") {
            list = list.filter((g) => g.phones.length === 0);
        } else if (filterId.startsWith("tag:")) {
            const tag = filterId.slice(4);
            list = list.filter((g) => (g.tags ?? []).includes(tag));
        }
        return list;
    }, [searched, filterId, currentGroupId]);

    const visibleGroups = useMemo(() => {
        const list = [...filtered];
        if (sortKey === "latest") {
            list.reverse();
            return list;
        }
        if (sortKey === "name-asc") {
            return list.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (sortKey === "name-desc") {
            return list.sort((a, b) => b.name.localeCompare(a.name));
        }
        if (sortKey === "members-desc") {
            return list.sort((a, b) => b.phones.length - a.phones.length);
        }
        if (sortKey === "members-asc") {
            return list.sort((a, b) => a.phones.length - b.phones.length);
        }
        return list;
    }, [filtered, sortKey]);

    useEffect(() => {
        if (expandedId && !visibleGroups.some((g) => g.id === expandedId)) {
            setExpandedId(null);
            setSettingsDetailGroupId(null);
        }
    }, [visibleGroups, expandedId]);

    const filterLabel = useMemo(() => {
        const hit = filterOptions.find((o) => o.id === filterId);
        return hit?.label ?? "All groups";
    }, [filterOptions, filterId]);

    const addMemberGroup = useMemo(
        () => groups.find((g) => g.id === addMemberGroupId),
        [groups, addMemberGroupId],
    );

    const toggleExpand = useCallback((id: string) => {
        setExpandedId((cur) => (cur === id ? null : id));
        setSettingsDetailGroupId(null);
    }, []);

    const expandWithSettings = useCallback((id: string) => {
        setExpandedId(id);
        setSettingsDetailGroupId(id);
    }, []);

    const toggleSettingsDetail = useCallback((id: string) => {
        setSettingsDetailGroupId((cur) => (cur === id ? null : id));
    }, []);

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
                    title="Groups"
                    icon={
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#fff3e7]">
                            <Waffle width={26} height={28} />
                        </View>
                    }
                />

                {groupsLoading ? (
                    <View className="mt-8 items-center py-8">
                        <ActivityIndicator size="large" color={ORANGE_CTA} />
                        <Text className="mt-2 font-josefin text-[13px] text-[#888]">
                            Loading groups…
                        </Text>
                    </View>
                ) : groupsError ? (
                    <View className="mt-4 rounded-2xl bg-[#fff3e8] px-4 py-4">
                        <Text className="font-josefin-bold text-[14px] text-[#c45a00]">
                            Could not load groups
                        </Text>
                        <Text className="mt-1 font-josefin text-[12px] text-[#666]">
                            {groupsError}
                        </Text>
                        <TouchableOpacity
                            onPress={() => void refreshGroups()}
                            className="mt-3 self-start rounded-full px-4 py-2"
                            style={{ backgroundColor: ORANGE_CTA }}
                        >
                            <Text className="font-josefin-bold text-[13px] text-white">
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

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

                <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                        activeOpacity={0.88}
                        className="flex-1 items-center justify-center rounded-xl bg-[#d9d9d9] py-2.5"
                    >
                        <Text className="font-josefin-bold text-[11px] text-white">
                            Fetch Contacts
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onAddGroup}
                        activeOpacity={0.88}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5"
                        style={{ backgroundColor: ORANGE_CTA }}
                    >
                        <Text className="font-josefin-bold text-[11px] text-white">
                            Add Group
                        </Text>
                        <FontAwesome name="plus" size={11} color="white" />
                    </TouchableOpacity>
                </View>

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
                            Sort By: {SORT_LABELS[sortKey]}
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
                    {!groupsLoading && !groupsError && groups.length === 0 ? (
                        <Text className="text-center font-josefin text-[13px] text-[#888]">
                            No groups yet. Tap Add Group to create one.
                        </Text>
                    ) : !groupsLoading && !groupsError && visibleGroups.length === 0 ? (
                        <Text className="text-center font-josefin text-[13px] text-[#888]">
                            No groups match your search and filters.
                        </Text>
                    ) : groupsLoading || groupsError ? null : (
                        visibleGroups.map((group) => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                expanded={expandedId === group.id}
                                isCurrent={currentGroupId === group.id}
                                settingsDetailOpen={settingsDetailGroupId === group.id}
                                onToggleExpand={() => toggleExpand(group.id)}
                                onPressCollapsedSettings={() =>
                                    expandWithSettings(group.id)
                                }
                                onToggleSettingsDetail={() =>
                                    toggleSettingsDetail(group.id)
                                }
                                onSetCurrent={() => setCurrentGroupId(group.id)}
                                onPressAddMember={() =>
                                    setAddMemberGroupId(group.id)
                                }
                                onRemovePhone={(phone) =>
                                    void removeMemberPhone(group.id, phone)
                                }
                                renameGroup={renameGroup}
                                updateGroupMeta={updateGroupMeta}
                            />
                        ))
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
                title="Sort groups"
                onClose={() => setSortMenuOpen(false)}
                options={(
                    Object.keys(SORT_LABELS) as SortKey[]
                ).map((id) => ({
                    id,
                    label: SORT_LABELS[id],
                }))}
                selectedId={sortKey}
                onSelect={(id) => {
                    setSortKey(id as SortKey);
                    setSortMenuOpen(false);
                }}
            />

            <OptionSheetModal
                visible={filterMenuOpen}
                title="Filter groups"
                onClose={() => setFilterMenuOpen(false)}
                options={filterOptions}
                selectedId={filterId}
                onSelect={(id) => {
                    setFilterId(id as FilterId);
                    setFilterMenuOpen(false);
                }}
            />

            <AddMemberModal
                visible={addMemberGroupId !== null}
                groupId={addMemberGroupId}
                groupName={addMemberGroup?.name ?? ""}
                onClose={() => setAddMemberGroupId(null)}
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

type GroupCardProps = {
    group: MockGroup;
    expanded: boolean;
    isCurrent: boolean;
    settingsDetailOpen: boolean;
    onToggleExpand: () => void;
    onPressCollapsedSettings: () => void;
    onToggleSettingsDetail: () => void;
    onSetCurrent: () => void;
    onPressAddMember: () => void;
    onRemovePhone: (phone: string) => void;
    renameGroup: (groupId: string, name: string) => Promise<void>;
    updateGroupMeta: (
        groupId: string,
        input: { descriptionHint: string; tags?: string[] },
    ) => Promise<void>;
};

function GroupCard({
    group,
    expanded,
    isCurrent,
    settingsDetailOpen,
    onToggleExpand,
    onPressCollapsedSettings,
    onToggleSettingsDetail,
    onSetCurrent,
    onPressAddMember,
    onRemovePhone,
    renameGroup,
    updateGroupMeta,
}: GroupCardProps) {
    const [description, setDescription] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [draftName, setDraftName] = useState(group.name);
    const [savingMeta, setSavingMeta] = useState(false);

    const membersLabel =
        group.phones.length > 0
            ? `+ ${group.phones.length}...`
            : group.extraMembersLabel;

    useEffect(() => {
        if (!editingName) setDraftName(group.name);
    }, [group.name, editingName]);

    useEffect(() => {
        setDescription(group.descriptionHint);
    }, [group.id, group.descriptionHint]);

    const commitName = () => {
        void (async () => {
            try {
                await renameGroup(group.id, draftName);
                setEditingName(false);
            } catch {
                setDraftName(group.name);
                setEditingName(false);
            }
        })();
    };

    const togglePencil = () => {
        if (editingName) {
            commitName();
        } else {
            setDraftName(group.name);
            setEditingName(true);
        }
    };

    const saveAndClose = () => {
        void (async () => {
            setSavingMeta(true);
            try {
                await updateGroupMeta(group.id, {
                    descriptionHint:
                        description.trim() || group.descriptionHint,
                    tags: group.tags,
                });
                onToggleExpand();
            } finally {
                setSavingMeta(false);
            }
        })();
    };

    if (!expanded) {
        return (
            <View
                className="overflow-hidden rounded-2xl"
                style={{ backgroundColor: CARD_BG }}
            >
                {isCurrent ? (
                    <View className="absolute right-2 top-2 z-10 flex-row items-center gap-1 rounded-full bg-[#2d7a3e] px-2 py-0.5">
                        <FontAwesome name="check" size={9} color="#fff" />
                        <Text className="font-josefin-bold text-[9px] text-white">
                            Current
                        </Text>
                    </View>
                ) : null}
                <View className="flex-row items-start justify-between px-3 py-3 pr-14">
                    <TouchableOpacity
                        onPress={editingName ? undefined : onToggleExpand}
                        disabled={editingName}
                        activeOpacity={0.92}
                        className="min-w-0 flex-1 pr-2"
                    >
                        {editingName ? (
                            <TextInput
                                value={draftName}
                                onChangeText={setDraftName}
                                onBlur={commitName}
                                multiline
                                autoFocus
                                className="min-h-[40px] font-josefin-bold text-[15px] text-white"
                                placeholderTextColor="rgba(255,255,255,0.45)"
                            />
                        ) : (
                            <Text className="font-josefin-bold text-[15px] text-white">
                                {group.name}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={togglePencil}
                        hitSlop={10}
                        className="pt-0.5"
                        accessibilityLabel={
                            editingName ? "Save group name" : "Edit group name"
                        }
                    >
                        <Pencil size={14} color="#ffffff" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center justify-between px-3 pb-3">
                    <View className="flex-row items-center">
                        <AvatarStack colors={group.avatarColors} />
                        <Text className="ml-1 font-josefin-bold text-[13px] text-[#f5f5f5]">
                            {membersLabel}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <MiniIconButton
                            icon="cog"
                            label="Settings"
                            onPress={onPressCollapsedSettings}
                        />
                        <MiniOrangeButton
                            icon="user-plus"
                            label="Add Member"
                            onPress={onPressAddMember}
                        />
                        <MiniOrangeButton
                            icon="user"
                            label="Set As Current"
                            narrow
                            onPress={onSetCurrent}
                        />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: CARD_BG }}>
            <View className="px-3 pt-3">
                <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1 flex-row items-start gap-1 pr-2">
                        {editingName ? (
                            <TextInput
                                value={draftName}
                                onChangeText={setDraftName}
                                onBlur={commitName}
                                multiline
                                autoFocus
                                className="min-h-[40px] flex-1 font-josefin-bold text-[15px] text-white"
                                placeholderTextColor="rgba(255,255,255,0.45)"
                            />
                        ) : (
                            <Text className="flex-1 font-josefin-bold text-[15px] text-white">
                                {group.name}
                            </Text>
                        )}
                        <TouchableOpacity
                            onPress={togglePencil}
                            hitSlop={10}
                            className="pt-0.5"
                            accessibilityLabel={
                                editingName ? "Save group name" : "Edit group name"
                            }
                        >
                            <Pencil size={14} color="#ffffff" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center">
                        <AvatarStack colors={group.avatarColors} />
                        <Text className="ml-1 font-josefin-bold text-[13px] text-[#f5f5f5]">
                            {membersLabel}
                        </Text>
                    </View>
                </View>

                {(group.tags?.length ?? 0) > 0 ? (
                    <View className="mt-2 flex-row flex-wrap gap-1">
                        {group.tags!.map((t) => (
                            <View
                                key={t}
                                className="rounded-full bg-white/15 px-2 py-0.5"
                            >
                                <Text className="font-josefin text-[9px] text-white/90">
                                    {t}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                <View className="mt-3 flex-row flex-wrap justify-end gap-1.5">
                    <MiniIconButton
                        icon="cog"
                        label="Settings"
                        onPress={onToggleSettingsDetail}
                    />
                    <MiniOrangeButton
                        icon="user-plus"
                        label="Add Member"
                        onPress={onPressAddMember}
                    />
                    <MiniOrangeButton
                        icon="user"
                        label="Set As Current"
                        narrow
                        onPress={onSetCurrent}
                    />
                </View>

                {settingsDetailOpen ? (
                    <View className="mt-3 rounded-xl border border-white/20 bg-[#4a4a4a] px-3 py-2.5">
                        <Text className="font-josefin-bold text-[11px] text-white/90">
                            Quick settings
                        </Text>
                        <Text className="mt-1 font-josefin text-[10px] leading-[14px] text-white/70">
                            Notifications, visibility, and invite link for{" "}
                            <Text className="font-josefin-bold text-white">{group.name}</Text>{" "}
                            can be wired here.
                        </Text>
                    </View>
                ) : null}

                <Text className="mt-4 font-josefin-bold text-[10px] text-white">
                    Description (Used For AI Preferencing)
                </Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={group.descriptionHint}
                    placeholderTextColor="rgba(0,0,0,0.45)"
                    multiline
                    className="mt-1 min-h-[72px] rounded-xl bg-white px-3 py-2 font-josefin text-[12px] text-[#2c2c2c]"
                />

                {group.phones.length > 0 ? (
                    <>
                        <Text className="mt-4 font-josefin-bold text-[10px] text-white">
                            Remove Members
                        </Text>
                        <View className="mt-2 gap-2">
                            {group.phones.map((phone) => (
                                <View
                                    key={phone}
                                    className="flex-row items-center justify-between rounded-full px-3 py-2"
                                    style={{ backgroundColor: ORANGE_CTA }}
                                >
                                    <Text className="font-josefin-light text-[11px] text-white">
                                        {phone}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => onRemovePhone(phone)}
                                        accessibilityLabel={`Remove ${phone}`}
                                    >
                                        <FontAwesome name="close" size={14} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </>
                ) : null}

                <View className="mt-4 flex-row justify-end pb-2">
                    <TouchableOpacity
                        onPress={saveAndClose}
                        activeOpacity={0.88}
                        disabled={savingMeta}
                        className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
                        style={{
                            backgroundColor: ORANGE_CTA,
                            opacity: savingMeta ? 0.6 : 1,
                        }}
                    >
                        <FontAwesome name="floppy-o" size={14} color="white" />
                        <Text className="font-josefin-bold text-[12px] text-white">
                            {savingMeta ? "Saving…" : "Save and Close"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View
                className="flex-row items-center justify-between border-t border-white/10 px-3 py-2.5"
                style={{ backgroundColor: "#3a3a3a" }}
            >
                <TouchableOpacity
                    onPress={onToggleSettingsDetail}
                    activeOpacity={0.85}
                    className="flex-row items-center gap-2 py-1"
                    accessibilityRole="button"
                    accessibilityLabel="Toggle settings"
                >
                    <Settings size={15} color="#fff" strokeWidth={2} />
                    <Text className="font-josefin-bold text-[12px] text-white">Settings</Text>
                    <ChevronDown
                        size={14}
                        color="#fff"
                        strokeWidth={2}
                        style={{
                            transform: [
                                { rotate: settingsDetailOpen ? "180deg" : "0deg" },
                            ],
                        }}
                    />
                </TouchableOpacity>

                {isCurrent ? (
                    <View className="max-w-[55%] flex-row items-center gap-1.5">
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-[#3cb371]">
                            <FontAwesome name="check" size={12} color="#fff" />
                        </View>
                        <Text className="font-josefin-bold text-[10px] text-white" numberOfLines={2}>
                            Current group
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={onSetCurrent}
                        activeOpacity={0.88}
                        className="max-w-[55%] flex-row items-center gap-1.5"
                    >
                        <FontAwesome name="circle-o" size={14} color="#fff" />
                        <Text
                            className="font-josefin-bold text-[10px] text-white underline"
                            numberOfLines={2}
                        >
                            Set as current group
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function AvatarStack({ colors }: { colors: string[] }) {
    return (
        <View className="flex-row items-center pl-1">
            {colors.map((c, i) => (
                <View
                    key={`${c}-${i}`}
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

function MiniIconButton({
    icon,
    label,
    onPress,
}: {
    icon: string;
    label: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} className="items-center" activeOpacity={0.85}>
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#3a3a3a]">
                <FontAwesome5 name={icon as "cog"} size={13} color="#fff" solid />
            </View>
            <Text
                className="mt-0.5 font-josefin-bold text-[8px] text-white"
                numberOfLines={1}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function MiniOrangeButton({
    icon,
    label,
    narrow,
    onPress,
}: {
    icon: string;
    label: string;
    narrow?: boolean;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.88}
            className={`items-center ${narrow ? "max-w-[64px]" : "max-w-[76px]"}`}
        >
            <View
                className="h-9 items-center justify-center rounded-lg px-1.5"
                style={{ backgroundColor: ORANGE_CTA, minWidth: narrow ? 52 : 56 }}
            >
                <FontAwesome5 name={icon as "user-plus"} size={12} color="#fff" solid />
            </View>
            <Text
                className="mt-0.5 text-center font-josefin-bold text-[8px] text-white"
                numberOfLines={2}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}
