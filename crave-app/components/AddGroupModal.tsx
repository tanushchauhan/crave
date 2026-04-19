import { useGroupsSession } from "@/context/GroupsSessionContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useState } from "react";
import {
    Modal,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const PAGE_BG = "#f4f4f4";
const TITLE_ORANGE = "#ff904b";
const CARD_BG = "#5a5a5a";
const ORANGE_CTA = "#f5861f";
const MUTED = "#a6a6a6";

type AddGroupModalProps = {
    visible: boolean;
    onClose: () => void;
};

export default function AddGroupModal({ visible, onClose }: AddGroupModalProps) {
    const { addGroup } = useGroupsSession();
    const [name, setName] = useState("");
    const [hint, setHint] = useState("");
    const [tagsRaw, setTagsRaw] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const reset = useCallback(() => {
        setName("");
        setHint("");
        setTagsRaw("");
        setLocalError(null);
    }, []);

    const handleSave = useCallback(() => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const tags = tagsRaw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        setLocalError(null);
        setSubmitting(true);
        void (async () => {
            try {
                await addGroup({
                    name: trimmed,
                    descriptionHint: hint.trim() || "Describe this group for the AI.",
                    tags: tags.length ? tags : undefined,
                });
                reset();
                onClose();
            } catch (e: unknown) {
                setLocalError(e instanceof Error ? e.message : "Could not create group");
            } finally {
                setSubmitting(false);
            }
        })();
    }, [addGroup, hint, name, onClose, reset, tagsRaw]);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [onClose, reset]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-center bg-black/45 px-4">
                <Pressable
                    className="absolute inset-0"
                    onPress={handleClose}
                    accessibilityLabel="Dismiss"
                />
                <View
                    className="overflow-hidden rounded-3xl"
                    style={{ backgroundColor: PAGE_BG }}
                >
                    <View
                        className="flex-row items-center justify-between px-4 py-3"
                        style={{ backgroundColor: CARD_BG }}
                    >
                        <View className="flex-row items-center gap-2">
                            <Text
                                className="font-josefin-bold text-[17px] text-white"
                                numberOfLines={1}
                            >
                                New group
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleClose}
                            hitSlop={12}
                            className="h-8 w-8 items-center justify-center rounded-full bg-white/15"
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <FontAwesome name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View className="px-4 pb-5 pt-4">
                        <Text
                            className="font-josefin-bold text-[12px]"
                            style={{ color: TITLE_ORANGE }}
                        >
                            Group name
                        </Text>
                        <TextInput
                            value={name}
                            onChangeText={(t) => {
                                setName(t);
                                setLocalError(null);
                            }}
                            placeholder='e.g. "The Boyz"'
                            placeholderTextColor={MUTED}
                            className="mt-1 rounded-xl border border-[#e0e0e0] bg-white px-3 py-2.5 font-josefin text-[14px] text-[#2c2c2c]"
                        />

                        <Text
                            className="mt-4 font-josefin-bold text-[12px]"
                            style={{ color: TITLE_ORANGE }}
                        >
                            AI description hint
                        </Text>
                        <TextInput
                            value={hint}
                            onChangeText={setHint}
                            placeholder="What does this group usually like?"
                            placeholderTextColor={MUTED}
                            multiline
                            className="mt-1 min-h-[72px] rounded-xl border border-[#e0e0e0] bg-white px-3 py-2.5 font-josefin text-[13px] text-[#2c2c2c]"
                        />

                        <Text
                            className="mt-4 font-josefin-bold text-[12px]"
                            style={{ color: TITLE_ORANGE }}
                        >
                            Tags (optional, comma-separated)
                        </Text>
                        <TextInput
                            value={tagsRaw}
                            onChangeText={setTagsRaw}
                            placeholder="Weekend, BBQ, Work"
                            placeholderTextColor={MUTED}
                            className="mt-1 rounded-xl border border-[#e0e0e0] bg-white px-3 py-2.5 font-josefin text-[13px] text-[#2c2c2c]"
                        />

                        {localError ? (
                            <Text className="mt-3 font-josefin text-[12px] text-[#c45a00]">
                                {localError}
                            </Text>
                        ) : null}

                        <TouchableOpacity
                            onPress={handleSave}
                            activeOpacity={0.9}
                            disabled={!name.trim() || submitting}
                            className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
                            style={{
                                backgroundColor: ORANGE_CTA,
                                opacity: name.trim() && !submitting ? 1 : 0.45,
                            }}
                        >
                            <FontAwesome name="check" size={15} color="#fff" />
                            <Text className="font-josefin-bold text-[14px] text-white">
                                {submitting ? "Creating…" : "Create group"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
