import FinishButton from "@/components/FinishButton";
import SocialRow, { SocialPlatform } from "@/components/SocialRow";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

type FinishConnectSocialsProps = {
    onFinished?: () => void;
};

type SocialState = {
    platform: SocialPlatform;
    name: string;
    status: string;
    connected: boolean;
};

const INITIAL_STATE: SocialState[] = [
    {
        platform: "instagram",
        name: "Instagram",
        status: "Not Connected",
        connected: false,
    },
    {
        platform: "facebook",
        name: "Facebook",
        status: "Handle: @Eddie_Zhou",
        connected: true,
    },
    {
        platform: "youtube",
        name: "YouTube",
        status: "Not Connected",
        connected: false,
    },
    {
        platform: "snapchat",
        name: "SnapChat",
        status: "Not Connected",
        connected: false,
    },
];

export default function FinishConnectSocials({
    onFinished,
}: FinishConnectSocialsProps) {
    const [socials, setSocials] = useState<SocialState[]>(INITIAL_STATE);

    const toggle = (platform: SocialPlatform) => {
        setSocials((prev) =>
            prev.map((s) =>
                s.platform === platform
                    ? {
                          ...s,
                          connected: !s.connected,
                          status: s.connected
                              ? "Not Connected"
                              : "Handle: @Eddie_Zhou",
                      }
                    : s
            )
        );
    };

    return (
        <View className="flex-1 px-5 pt-2">
            <View className="flex-row items-center">
                <Text className="text-[18px] font-bold text-[#434343] mr-2">
                    Connect Your Socials
                </Text>
                <FontAwesome name="share-alt" size={16} color="#434343" />
            </View>

            <ScrollView
                className="mt-4"
                contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
            >
                {socials.map((s) => (
                    <SocialRow
                        key={s.platform}
                        platform={s.platform}
                        name={s.name}
                        status={s.status}
                        connected={s.connected}
                        onPress={() => toggle(s.platform)}
                    />
                ))}
            </ScrollView>

            <View className="flex-row justify-end pb-6">
                <FinishButton onPress={onFinished} />
            </View>
        </View>
    );
}
