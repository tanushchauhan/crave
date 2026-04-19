import type { MockGroup } from "@/constants/groupsMockData";
import { MOCK_GROUPS } from "@/constants/groupsMockData";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

function cloneGroups(): MockGroup[] {
    return MOCK_GROUPS.map((g) => ({
        ...g,
        phones: [...g.phones],
        tags: g.tags ? [...g.tags] : [],
    }));
}

export type GroupsSessionContextValue = {
    groups: MockGroup[];
    currentGroupId: string;
    currentGroup: MockGroup | undefined;
    setCurrentGroupId: (id: string) => void;
    addGroup: (input: {
        name: string;
        descriptionHint: string;
        tags?: string[];
    }) => string;
    addMemberPhone: (groupId: string, phone: string) => void;
    removeMemberPhone: (groupId: string, phone: string) => void;
    renameGroup: (groupId: string, name: string) => void;
};

const GroupsSessionContext = createContext<GroupsSessionContextValue | null>(
    null,
);

export function GroupsSessionProvider({ children }: { children: ReactNode }) {
    const [groups, setGroups] = useState<MockGroup[]>(cloneGroups);
    const [currentGroupId, setCurrentGroupId] = useState<string>(
        MOCK_GROUPS[0]?.id ?? "",
    );

    const currentGroup = useMemo(
        () => groups.find((g) => g.id === currentGroupId),
        [groups, currentGroupId],
    );

    const addGroup = useCallback(
        (input: { name: string; descriptionHint: string; tags?: string[] }) => {
            const id = `g-${Date.now()}`;
            const colors = ["#c4a574", "#8ab8d4", "#d48a8a", "#e8b44c"];
            setGroups((prev) => {
                const newGroup: MockGroup = {
                    id,
                    name: input.name.trim(),
                    extraMembersLabel: "+ 0...",
                    phones: [],
                    avatarColors: [
                        colors[prev.length % colors.length]!,
                        "#a8a8a8",
                    ],
                    descriptionHint: input.descriptionHint.trim() || "New group",
                    tags: input.tags?.length ? input.tags : ["General"],
                };
                return [...prev, newGroup];
            });
            setCurrentGroupId(id);
            return id;
        },
        [],
    );

    const addMemberPhone = useCallback((groupId: string, phone: string) => {
        const trimmed = phone.trim();
        if (!trimmed) return;
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                if (g.phones.includes(trimmed)) return g;
                const phones = [...g.phones, trimmed];
                return {
                    ...g,
                    phones,
                    extraMembersLabel: `+ ${phones.length}...`,
                };
            }),
        );
    }, []);

    const removeMemberPhone = useCallback((groupId: string, phone: string) => {
        setGroups((prev) =>
            prev.map((g) => {
                if (g.id !== groupId) return g;
                const phones = g.phones.filter((p) => p !== phone);
                return {
                    ...g,
                    phones,
                    extraMembersLabel: `+ ${phones.length}...`,
                };
            }),
        );
    }, []);

    const renameGroup = useCallback((groupId: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setGroups((prev) =>
            prev.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g)),
        );
    }, []);

    const value = useMemo(
        () => ({
            groups,
            currentGroupId,
            currentGroup,
            setCurrentGroupId,
            addGroup,
            addMemberPhone,
            removeMemberPhone,
            renameGroup,
        }),
        [
            groups,
            currentGroupId,
            currentGroup,
            addGroup,
            addMemberPhone,
            removeMemberPhone,
            renameGroup,
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
