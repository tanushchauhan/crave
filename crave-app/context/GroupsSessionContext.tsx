import type { MockGroup } from "@/constants/groupsMockData";
import {
    addMemberToGroup,
    createDiningGroup,
    fetchMyGroups,
    removeMemberFromGroup,
    removeMemberFromGroupByUserId,
    updateDiningGroupContext,
    updateDiningGroupName,
} from "@/lib/groupsApi";
import { parseToE164 } from "@/lib/phone";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type GroupsSessionContextValue = {
    groups: MockGroup[];
    groupsLoading: boolean;
    groupsError: string | null;
    refreshGroups: () => Promise<void>;
    currentGroupId: string;
    currentGroup: MockGroup | undefined;
    setCurrentGroupId: (id: string) => void;
    addGroup: (input: {
        name: string;
        descriptionHint: string;
        tags?: string[];
    }) => Promise<string>;
    addMemberPhone: (groupId: string, phoneE164: string) => Promise<void>;
    removeMemberPhone: (groupId: string, phoneE164: string) => Promise<void>;
    renameGroup: (groupId: string, name: string) => Promise<void>;
    updateGroupMeta: (
        groupId: string,
        input: { descriptionHint: string; tags?: string[] },
    ) => Promise<void>;
};

const GroupsSessionContext = createContext<GroupsSessionContextValue | null>(
    null,
);

export function GroupsSessionProvider({ children }: { children: ReactNode }) {
    const [groups, setGroups] = useState<MockGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupsError, setGroupsError] = useState<string | null>(null);
    const [currentGroupId, setCurrentGroupId] = useState<string>("");

    const refreshGroups = useCallback(async () => {
        setGroupsLoading(true);
        setGroupsError(null);
        try {
            const rows = await fetchMyGroups();
            setGroups(rows);
            setCurrentGroupId((prev) => {
                if (prev && rows.some((g) => g.id === prev)) {
                    return prev;
                }
                return rows[0]?.id ?? "";
            });
        } catch (e: unknown) {
            setGroupsError(e instanceof Error ? e.message : "Failed to load groups");
            setGroups([]);
        } finally {
            setGroupsLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshGroups();
    }, [refreshGroups]);

    const currentGroup = useMemo(
        () => groups.find((g) => g.id === currentGroupId),
        [groups, currentGroupId],
    );

    const addGroup = useCallback(
        async (input: {
            name: string;
            descriptionHint: string;
            tags?: string[];
        }) => {
            const id = await createDiningGroup(input);
            await refreshGroups();
            setCurrentGroupId(id);
            return id;
        },
        [refreshGroups],
    );

    const addMemberPhone = useCallback(
        async (groupId: string, phoneE164: string) => {
            await addMemberToGroup(groupId, phoneE164);
            await refreshGroups();
        },
        [refreshGroups],
    );

    const removeMemberPhone = useCallback(
        async (groupId: string, phoneLabel: string) => {
            const g = groups.find((x) => x.id === groupId);
            const idx = g?.phones.findIndex((p) => p === phoneLabel) ?? -1;
            const uid =
                idx >= 0 && g?.memberUserIds && g.memberUserIds[idx]
                    ? g.memberUserIds[idx]
                    : undefined;
            if (uid) {
                await removeMemberFromGroupByUserId(groupId, uid);
            } else {
                const parsed = parseToE164(phoneLabel);
                if (!parsed.ok) {
                    throw new Error(
                        "Cannot remove this row: open the group from the server after a refresh.",
                    );
                }
                await removeMemberFromGroup(groupId, parsed.e164);
            }
            await refreshGroups();
        },
        [groups, refreshGroups],
    );

    const renameGroup = useCallback(
        async (groupId: string, name: string) => {
            await updateDiningGroupName(groupId, name);
            await refreshGroups();
        },
        [refreshGroups],
    );

    const updateGroupMeta = useCallback(
        async (
            groupId: string,
            input: { descriptionHint: string; tags?: string[] },
        ) => {
            await updateDiningGroupContext(
                groupId,
                input.descriptionHint,
                input.tags,
            );
            await refreshGroups();
        },
        [refreshGroups],
    );

    const value = useMemo(
        () => ({
            groups,
            groupsLoading,
            groupsError,
            refreshGroups,
            currentGroupId,
            currentGroup,
            setCurrentGroupId,
            addGroup,
            addMemberPhone,
            removeMemberPhone,
            renameGroup,
            updateGroupMeta,
        }),
        [
            groups,
            groupsLoading,
            groupsError,
            refreshGroups,
            currentGroupId,
            currentGroup,
            addGroup,
            addMemberPhone,
            removeMemberPhone,
            renameGroup,
            updateGroupMeta,
        ],
    );

    return (
        <GroupsSessionContext.Provider value={value}>
            {children}
        </GroupsSessionContext.Provider>
    );
}

export function useGroupsSession(): GroupsSessionContextValue {
    const ctx = useContext(GroupsSessionContext);
    if (!ctx) {
        throw new Error("useGroupsSession must be used within GroupsSessionProvider");
    }
    return ctx;
}
