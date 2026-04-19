export type GroupMemberPhone = string;

export type MockGroup = {
    id: string;
    name: string;
    extraMembersLabel: string;
    phones: GroupMemberPhone[];
    /** Same order as `phones` when loaded from Supabase (for delete by user id). */
    memberUserIds?: (string | undefined)[];
    avatarColors: string[];
    /** Short blurb for AI / description placeholder */
    descriptionHint: string;
    /** Used for Filters (e.g. Weekend, Work, Veg) */
    tags?: string[];
};

export const MOCK_GROUPS: MockGroup[] = [
    {
        id: "boyz",
        name: 'The "Boyz"',
        extraMembersLabel: "+ 3...",
        phones: [
            "(682) - 252 - 2215",
            "(111) - 111 - 1111",
            "(234) - 818 - 0232",
        ],
        avatarColors: ["#c4a574", "#8ab8d4", "#d48a8a"],
        descriptionHint: "Weekend dinners, spicy BBQ crowd.",
        tags: ["Weekend", "BBQ", "Friends"],
    },
    {
        id: "kfc",
        name: "KFC",
        extraMembersLabel: "+ 1...",
        phones: [],
        avatarColors: ["#e8b44c", "#7a9fd6"],
        descriptionHint: "Quick lunch runs near campus.",
        tags: ["Work", "Lunch", "Quick"],
    },
    {
        id: "book-club",
        name: "Sunday Book Club",
        extraMembersLabel: "+ 5...",
        phones: ["(512) - 400 - 8899", "(512) - 401 - 2210"],
        avatarColors: ["#b88fd4", "#6fcf97", "#56ccf2"],
        descriptionHint: "Vegetarian-forward, quiet tables.",
        tags: ["Weekend", "Veg", "Quiet"],
    },
];

export function collectGroupTags(groups: MockGroup[]): string[] {
    const set = new Set<string>();
    for (const g of groups) {
        for (const t of g.tags ?? []) {
            if (t.trim()) set.add(t.trim());
        }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function filterGroupsBySearch(
    groups: MockGroup[],
    query: string,
): MockGroup[] {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
        (g) =>
            g.name.toLowerCase().includes(q) ||
            g.descriptionHint.toLowerCase().includes(q),
    );
}
