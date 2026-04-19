import { useGroupsSession } from "@/context/GroupsSessionContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useEffect, useState } from "react";
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

type AddMemberModalProps = {
    visible: boolean;
    groupId: string | null;
    groupName: string;
    onClose: () => void;
};

export default function AddMemberModal({
    visible,
    groupId,
    groupName,
    onClose,
}: AddMemberModalProps) {
    const { addMemberPhone } = useGroupsSession();
    const [phone, setPhone] = useState("");

    useEffect(() => {
        if (visible) setPhone("");
    }, [visible, groupId]);

    const handleAdd = useCallback(() => {
        if (!groupId) return;
        const trimmed = phone.trim();
        if (!trimmed) return;
        addMemberPhone(groupId, trimmed);
        setPhone("");
        onClose();
    }, [addMemberPhone, groupId, onClose, phone]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center bg-black/45 px-4">
                <Pressable
                    className="absolute inset-0"
                    onPress={onClose}
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
                        <Text
                            className="flex-1 pr-2 font-josefin-bold text-[16px] text-white"
                            numberOfLines={2}
                        >
                            Add member to{" "}
                            <Text className="text-[#ffd4b8]">{groupName}</Text>
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={12}
                            className="h-8 w-8 items-center justify-center rounded-full bg-white/15"
                        >
                            <FontAwesome name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View className="px-4 pb-5 pt-4">
                        <Text
                            className="font-josefin-bold text-[12px]"
                            style={{ color: TITLE_ORANGE }}
                        >
                            Phone number
                        </Text>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="(555) - 123 - 4567"
                            placeholderTextColor={MUTED}
                            keyboardType="phone-pad"
                            className="mt-1 rounded-xl border border-[#e0e0e0] bg-white px-3 py-2.5 font-josefin text-[14px] text-[#2c2c2c]"
                        />

                        <TouchableOpacity
                            onPress={handleAdd}
                            activeOpacity={0.9}
                            disabled={!groupId || !phone.trim()}
                            className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl py-3.5"
                            style={{
                                backgroundColor: ORANGE_CTA,
                                opacity: groupId && phone.trim() ? 1 : 0.45,
                            }}
                        >
                            <FontAwesome name="user-plus" size={14} color="#fff" />
                            <Text className="font-josefin-bold text-[14px] text-white">
                                Add member
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
