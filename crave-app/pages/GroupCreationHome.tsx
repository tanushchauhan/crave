import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Phone, UsersRound } from "lucide-react-native";
import { useState } from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import GroupCreationTalkToVoice from "./GroupCreationTalkToVoice";

type GroupCreationHomeProps = {
    onBack?: () => void;
    onFinished?: () => void;
};

type SubPage = "home" | "talkToVoice";

export default function GroupCreationHome({
    onBack,
    onFinished,
}: GroupCreationHomeProps) {
    const insets = useSafeAreaInsets();
    const [subPage, setSubPage] = useState<SubPage>("home");
    const [voiceSummary, setVoiceSummary] = useState<string | null>(null);

    if (subPage === "talkToVoice") {
        return (
            <GroupCreationTalkToVoice
                onBack={() => setSubPage("home")}
                onFinished={(transcript) => {
                    setVoiceSummary(transcript);
                    setSubPage("home");
                }}
            />
        );
    }

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={["top", "left", "right"]}
        >
            <View className="flex-row items-center justify-between px-4 pt-2">
                <TouchableOpacity
                    onPress={onBack}
                    className="h-9 w-9 items-center justify-center rounded-full bg-[#f2f2f2]"
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                >
                    <FontAwesome name="arrow-left" size={14} color="#444" />
                </TouchableOpacity>
                <Text className="font-josefin-bold text-[15px] text-[#2c2c2c]">
                    Create a Group
                </Text>
                <View className="h-9 w-9" />
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 120,
                    paddingHorizontal: 20,
                    paddingTop: 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="items-center justify-center rounded-2xl bg-[#fff3e7] py-6">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-[#f5861f]">
                        <UsersRound size={26} color="#ffffff" strokeWidth={2} />
                    </View>
                    <Text className="mt-3 font-josefin-bold text-[18px] text-[#2c2c2c]">
                        Dine with friends
                    </Text>
                    <Text className="mt-1 px-6 text-center font-josefin text-[12px] leading-[16px] text-[#666]">
                        Start a group and let Crave find a place everyone will
                        love.
                    </Text>
                </View>

                <Text className="mt-6 mb-3 font-josefin-bold text-[13px] text-[#777] uppercase tracking-widest">
                    Start with
                </Text>

                <TouchableOpacity
                    onPress={() => setSubPage("talkToVoice")}
                    activeOpacity={0.88}
                    className="flex-row items-center gap-3 rounded-2xl border border-[#ececec] bg-white p-4"
                >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-[#f5861f]">
                        <Phone size={20} color="#ffffff" strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                        <Text className="font-josefin-bold text-[14px] text-[#2c2c2c]">
                            Talk To Voice
                        </Text>
                        <Text className="mt-0.5 font-josefin text-[11px] leading-[14px] text-[#777]">
                            Describe your group out loud, we&rsquo;ll handle
                            the rest.
                        </Text>
                    </View>
                    <FontAwesome5
                        name="chevron-right"
                        size={14}
                        color="#b0b0b0"
                    />
                </TouchableOpacity>

                {voiceSummary !== null ? (
                    <View className="mt-4 rounded-2xl border border-[#e4f4e6] bg-[#effaf0] p-4">
                        <View className="flex-row items-center gap-2">
                            <View className="h-5 w-5 items-center justify-center rounded-full bg-[#3ab54a]">
                                <FontAwesome
                                    name="check"
                                    size={10}
                                    color="white"
                                />
                            </View>
                            <Text className="font-josefin-bold text-[13px] text-[#2c2c2c]">
                                Voice session captured
                            </Text>
                        </View>
                        <Text
                            className="mt-2 font-josefin text-[12px] leading-[16px] text-[#555]"
                            numberOfLines={3}
                        >
                            {voiceSummary.trim().length > 0
                                ? voiceSummary
                                : "We're ready to match you with the right spot."}
                        </Text>
                    </View>
                ) : null}

                <Text className="mt-8 mb-3 font-josefin-bold text-[13px] text-[#777] uppercase tracking-widest">
                    Or do it manually
                </Text>

                <View className="gap-3">
                    <View className="rounded-2xl border border-[#ececec] bg-white p-4">
                        <Text className="font-josefin-bold text-[14px] text-[#2c2c2c]">
                            Invite by contacts
                        </Text>
                        <Text className="mt-1 font-josefin text-[11px] leading-[14px] text-[#777]">
                            Pull in friends from your phone or Crave network.
                        </Text>
                    </View>
                    <View className="rounded-2xl border border-[#ececec] bg-white p-4">
                        <Text className="font-josefin-bold text-[14px] text-[#2c2c2c]">
                            Share an invite link
                        </Text>
                        <Text className="mt-1 font-josefin text-[11px] leading-[14px] text-[#777]">
                            Let people join your group from any chat app.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View
                className="absolute left-0 right-0 bottom-0 border-t border-[#ececec] bg-white px-5 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
                <TouchableOpacity
                    onPress={onFinished}
                    activeOpacity={0.9}
                    className="rounded-full bg-[#f5861f] py-3"
                    accessibilityRole="button"
                    accessibilityLabel="Create group"
                >
                    <Text className="text-center font-josefin-bold text-[14px] text-white">
                        Create Group
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
