import { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";

type BottomSheetProps = {
    visible: boolean;
    onClose: () => void;
    heightRatio?: number;
    children: ReactNode;
};

export default function BottomSheet({
    visible,
    onClose,
    heightRatio = 0.55,
    children,
}: BottomSheetProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/40 justify-end"
            >
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    style={{ height: `${heightRatio * 100}%` }}
                    className="bg-white rounded-t-[24px] overflow-hidden"
                >
                    <View className="items-center pt-3 pb-1">
                        <View className="h-1.5 w-12 rounded-full bg-[#d9d9d9]" />
                    </View>
                    <View className="flex-1">{children}</View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
