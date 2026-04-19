import FinishButton from "@/components/FinishButton";
import RipplePressable from "@/components/RipplePressable";
import { pickReceiptDocument } from "@/lib/pickReceipt";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";

type ReceiptItem = {
    uri: string;
    name: string;
    mimeType?: string | null;
};

type FinishUploadOrdersProps = {
    onFinished?: () => void;
};

export default function FinishUploadOrders({
    onFinished,
}: FinishUploadOrdersProps) {
    const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

    const addReceipt = useCallback(async () => {
        const picked = await pickReceiptDocument();
        if (!picked) return;
        setReceipts((prev) => [...prev, picked]);
    }, []);

    return (
        <View className="flex-1 px-5 pt-2">
            <View className="flex-row items-center">
                <Text className="mr-2 text-[18px] font-bold text-[#434343]">
                    Upload Your Orders
                </Text>
                <FontAwesome name="file-text-o" size={16} color="#434343" />
            </View>

            <Text className="mt-2 text-[12px] leading-4 text-[#888]">
                Feel free to upload past orders using images. From receipts, to the orders
                page of Food Delivery Apps.{" "}
                <Text className="font-bold italic">Images and PDFs</Text> are supported.
            </Text>

            <ScrollView
                className="mt-4 flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
            >
                <View
                    className="flex-row flex-wrap"
                    style={{ gap: 12, rowGap: 12 }}
                >
                    {receipts.map((r, i) => (
                        <View
                            key={`${r.uri}-${i}`}
                            className="h-28 w-24 overflow-hidden rounded-2xl border border-[#dcdcdc] bg-[#f0f0f0]"
                        >
                            {r.mimeType?.includes("pdf") ||
                            r.name.toLowerCase().endsWith(".pdf") ? (
                                <View className="flex-1 items-center justify-center px-1">
                                    <FontAwesome name="file-pdf-o" size={28} color="#c0392b" />
                                    <Text
                                        className="mt-1 px-1 text-center text-[9px] text-[#666]"
                                        numberOfLines={2}
                                    >
                                        {r.name}
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Image
                                        source={{ uri: r.uri }}
                                        className="h-[72px] w-full"
                                        resizeMode="cover"
                                    />
                                    <Text
                                        className="px-1 py-1 text-center text-[9px] text-[#666]"
                                        numberOfLines={2}
                                    >
                                        {r.name}
                                    </Text>
                                </>
                            )}
                        </View>
                    ))}

                    <RipplePressable
                        borderRadius={16}
                        onPress={addReceipt}
                        className="h-28 w-24 items-center justify-center rounded-2xl border-2 border-[#ececec] bg-white"
                    >
                        <FontAwesome name="camera" size={26} color="#434343" />
                        <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-[#f5861f]">
                            <FontAwesome name="plus" size={10} color="white" />
                        </View>
                        <Text className="absolute bottom-2 px-1 text-center text-[9px] text-[#888]">
                            Add receipt
                        </Text>
                    </RipplePressable>
                </View>
            </ScrollView>

            <View className="flex-row justify-end pb-6">
                <FinishButton onPress={onFinished} />
            </View>
        </View>
    );
}
