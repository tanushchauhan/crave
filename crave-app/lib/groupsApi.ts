import type { MockGroup } from "@/constants/groupsMockData";
import { supabase } from "@/lib/supabase";

const AVATAR_PALETTE = [
    "#c4a574",
    "#8ab8d4",
    "#d48a8a",
    "#e8b44c",
    "#b88fd4",
    "#6fcf97",
];

export function formatContextTag(
    descriptionHint: string,
    tags: string[] | undefined,
): string {
    const hint = descriptionHint.trim() || "Group";
    const parts = (tags ?? []).map((t) => t.trim()).filter(Boolean);
    if (!parts.length) {
        return hint;
    }
    return `${hint}|${parts.join(",")}`;
}

export function parseContextTag(raw: string | null): {
    descriptionHint: string;
    tags: string[];
} {
    if (!raw?.trim()) {
        return { descriptionHint: "Describe this group for the AI.", tags: ["General"] };
    }
    const i = raw.indexOf("|");
    if (i < 0) {
        return { descriptionHint: raw.trim(), tags: ["General"] };
    }
    const hint = raw.slice(0, i).trim() || "Group";
    const rest = raw.slice(i + 1).trim();
    const tags = rest
        ? rest
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
        : [];
    return {
        descriptionHint: hint,
        tags: tags.length ? tags : ["General"],
    };
}

function avatarColorsForIndex(index: number): string[] {
    const a = AVATAR_PALETTE[index % AVATAR_PALETTE.length]!;
    const b = AVATAR_PALETTE[(index + 2) % AVATAR_PALETTE.length]!;
    return [a, b];
}

type UserEmbed = { phone: string | null; display_name: string | null };

type MemberRow = {
    user_id: string;
    users: UserEmbed | UserEmbed[] | null;
};

function embedUser(u: UserEmbed | UserEmbed[] | null | undefined): UserEmbed | null {
    if (u == null) {
        return null;
    }
    return Array.isArray(u) ? (u[0] ?? null) : u;
}

type DiningGroupRow = {
    id: string;
    name: string;
    owner_id: string;
    context_tag: string | null;
    created_at: string;
    group_members: MemberRow[] | null;
};

function mapRowToMockGroup(row: DiningGroupRow, index: number): MockGroup {
    const { descriptionHint, tags } = parseContextTag(row.context_tag);
    const members = row.group_members ?? [];
    const phones: string[] = [];
    const memberUserIds: string[] = [];
    for (const m of members) {
        const uid = m.user_id;
        const u = embedUser(m.users);
        const p = u?.phone?.trim();
        const label =
            p ||
            u?.display_name?.trim() ||
            `${uid.slice(0, 8)}…`;
        phones.push(label);
        memberUserIds.push(uid);
    }
    return {
        id: row.id,
        name: row.name,
        extraMembersLabel: `+ ${phones.length}...`,
        phones,
        memberUserIds: memberUserIds.length ? memberUserIds : undefined,
        avatarColors: avatarColorsForIndex(index),
        descriptionHint,
        tags,
    };
}

export async function fetchMyGroups(): Promise<MockGroup[]> {
    const { data, error } = await supabase
        .from("dining_groups")
        .select(
            `
      id,
      name,
      owner_id,
      context_tag,
      created_at,
      group_members (
        user_id,
        users ( phone, display_name )
      )
    `,
        )
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    const rows = (data ?? []) as unknown as DiningGroupRow[];
    return rows.map((r, i) => mapRowToMockGroup(r, i));
}

export async function createDiningGroup(input: {
    name: string;
    descriptionHint: string;
    tags?: string[];
}): Promise<string> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Sign in required");
    }

    const context_tag = formatContextTag(input.descriptionHint, input.tags);
    const { data, error } = await supabase
        .from("dining_groups")
        .insert({
            name: input.name.trim(),
            owner_id: user.id,
            context_tag,
        })
        .select("id")
        .single();

    if (error) {
        throw new Error(error.message);
    }
    return data!.id as string;
}

export async function updateDiningGroupName(
    groupId: string,
    name: string,
): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
        throw new Error("Name required");
    }
    const { error } = await supabase
        .from("dining_groups")
        .update({ name: trimmed })
        .eq("id", groupId);

    if (error) {
        throw new Error(error.message);
    }
}

export async function updateDiningGroupContext(
    groupId: string,
    descriptionHint: string,
    tags: string[] | undefined,
): Promise<void> {
    const context_tag = formatContextTag(descriptionHint, tags);
    const { error } = await supabase
        .from("dining_groups")
        .update({ context_tag })
        .eq("id", groupId);

    if (error) {
        throw new Error(error.message);
    }
}

export async function addMemberToGroup(
    groupId: string,
    phoneE164: string,
): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Sign in required");
    }

    const { data: ownerRow, error: ogErr } = await supabase
        .from("dining_groups")
        .select("owner_id")
        .eq("id", groupId)
        .single();

    if (ogErr || !ownerRow) {
        throw new Error(ogErr?.message ?? "Group not found");
    }

    const { data: inviteeId, error: rpcErr } = await supabase.rpc(
        "lookup_user_id_for_group_invite",
        { p_group_id: groupId, p_phone_e164: phoneE164 },
    );

    if (rpcErr) {
        throw new Error(rpcErr.message);
    }

    if (!inviteeId) {
        throw new Error(
            "No Crave account for that number. They must sign up with the same phone (E.164).",
        );
    }

    if (inviteeId === user.id && ownerRow.owner_id === user.id) {
        throw new Error("You're already the owner of this group.");
    }

    const { error: insErr } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: inviteeId as string,
    });

    if (insErr) {
        if (insErr.code === "23505") {
            throw new Error("That member is already in this group.");
        }
        throw new Error(insErr.message);
    }
}

export async function removeMemberFromGroup(
    groupId: string,
    phoneE164: string,
): Promise<void> {
    const { data: inviteeId, error: rpcErr } = await supabase.rpc(
        "lookup_user_id_for_group_invite",
        { p_group_id: groupId, p_phone_e164: phoneE164 },
    );

    if (rpcErr) {
        throw new Error(rpcErr.message);
    }
    if (!inviteeId) {
        throw new Error("Member not found for that number.");
    }

    await removeMemberFromGroupByUserId(groupId, inviteeId as string);
}

export async function removeMemberFromGroupByUserId(
    groupId: string,
    userId: string,
): Promise<void> {
    const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

    if (error) {
        throw new Error(error.message);
    }
}
