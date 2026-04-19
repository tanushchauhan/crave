import Waffle from "@/assets/canva/assets/6.svg";
import BottomSheet from "@/components/BottomSheet";
import LayeredTitle from "@/components/LayeredTitle";
import TaskRow, { FINISH_SETUP_PAGE_ORANGE } from "@/components/TaskRow";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FinishConnectSocials from "./FinishConnectSocials";
import FinishSelectFoods from "./FinishSelectFoods";
import FinishSetupTalkToVoice from "./FinishSetupTalkToVoice";
import FinishUploadOrders from "./FinishUploadOrders";

type ModalKind = "upload" | "socials" | null;
type SubPage = "selectFoods" | "talkToVoice" | null;

type FinishSetupHomeProps = {
    onComplete?: () => void;
};

export default function FinishSetupHome({ onComplete }: FinishSetupHomeProps = {}) {
    const insets = useSafeAreaInsets();
    const [modal, setModal] = useState<ModalKind>(null);
    const [subPage, setSubPage] = useState<SubPage>(null);

    const [voiceDone, setVoiceDone] = useState(false);
    const [foodsDone, setFoodsDone] = useState(false);
    const [socialsDone, setSocialsDone] = useState(false);
    const [uploadDone, setUploadDone] = useState(false);

    if (subPage === "selectFoods") {
        return (
            <FinishSelectFoods
                onFinished={() => {
                    setFoodsDone(true);
                    setSubPage(null);
                }}
                onBack={() => setSubPage(null)}
            />
        );
    }

    if (subPage === "talkToVoice") {
        return (
            <FinishSetupTalkToVoice
                onFinished={() => {
                    setVoiceDone(true);
                    setSubPage(null);
                }}
            />
        );
    }

    return (
        <View
            className="flex-1"
            style={{ backgroundColor: FINISH_SETUP_PAGE_ORANGE }}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 24,
                    paddingTop: 28,
                    paddingBottom: Math.max(insets.bottom, 20) + 8,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row flex-wrap items-end justify-center gap-x-1 gap-y-0">
                    <View className="pb-1 mr-4">
                        <LayeredTitle fontSize={48} shadowColor="#141c3a">
                            {"You're"}
                        </LayeredTitle>
                    </View>
                    <View className="pb-1">
                        <LayeredTitle fontSize={56} shadowColor="#141c3a">
                            In
                        </LayeredTitle>
                    </View>
                    <Waffle width={128} height={138} />
                </View>

                <Text className="mt-10 text-center font-josefin-bold text-[18px] leading-7 text-white px-2">
                    {"Tell Us The Foods You Love and We'll Do The Rest"}
                </Text>

                <View className="mt-12 flex-row items-center">
                    <FontAwesome
                        name="exclamation-circle"
                        size={17}
                        color="white"
                        style={{ marginRight: 8 }}
                    />
                    <Text className="font-josefin-bold text-[14px] text-white">
                        Required ( {voiceDone || foodsDone ? 1 : 0} / 1 )
                    </Text>
                </View>

                <View className="mt-4 gap-4">
                    <TaskRow
                        iconName="phone"
                        label="Talk To A Voice Agent"
                        completed={voiceDone}
                        onPress={() => setSubPage("talkToVoice")}
                    />
                    <TaskRow
                        iconName="ice-cream"
                        label="Select Foods You Like"
                        completed={foodsDone}
                        onPress={() => setSubPage("selectFoods")}
                    />
                </View>

                <View className="mt-10 flex-row items-center">
                    <FontAwesome
                        name="cog"
                        size={16}
                        color="white"
                        style={{ marginRight: 8 }}
                    />
                    <Text className="font-josefin-bold text-[14px] text-white">
                        Optional
                    </Text>
                </View>

                <View className="mt-4 gap-4">
                    <TaskRow
                        iconName="camera"
                        label="Connect Your Socials"
                        completed={socialsDone}
                        onPress={() => setModal("socials")}
                    />
                    <TaskRow
                        iconName="receipt"
                        label="Upload Past Orders"
                        completed={uploadDone}
                        onPress={() => setModal("upload")}
                    />
                </View>

                <View className="min-h-10 flex-1" />

                <View className="flex-row justify-end pt-6">
                    <Pressable
                        onPress={onComplete}
                        android_ripple={{
                            color: "rgba(255,255,255,0.4)",
                            borderless: false,
                        }}
                        className="flex-row items-center overflow-hidden rounded-full py-2 pl-4 pr-1"
                        style={({ pressed }) => [
                            Platform.OS === "ios" && pressed
                                ? { opacity: 0.88 }
                                : null,
                        ]}
                    >
                        <Text className="mr-3 font-josefin-bold text-[22px] text-white">
                            Next
                        </Text>
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
                            <FontAwesome5
                                name="chevron-right"
                                size={18}
                                solid
                                color={FINISH_SETUP_PAGE_ORANGE}
                            />
                        </View>
                    </Pressable>
                </View>
            </ScrollView>

            <BottomSheet
                visible={modal === "upload"}
                onClose={() => setModal(null)}
                heightRatio={0.6}
            >
                <FinishUploadOrders
                    onFinished={() => {
                        setUploadDone(true);
                        setModal(null);
                    }}
                />
            </BottomSheet>

            <BottomSheet
                visible={modal === "socials"}
                onClose={() => setModal(null)}
                heightRatio={0.65}
            >
                <FinishConnectSocials
                    onFinished={() => {
                        setSocialsDone(true);
                        setModal(null);
                    }}
                />
            </BottomSheet>
        </View>
    );
}
