import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import RipplePressable from "@/components/RipplePressable";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { useUserSettings } from "@/context/UserSettingsContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { Bell, Camera, MapPin, Mic } from "lucide-react-native";
import { useCallback } from "react";
import {
    Image,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const ORANGE = "#f5861f";
const TITLE = "#ff751f";
const MUTED = "#a6a6a6";
const TRACK_OFF = "#d0d0d0";

type SettingsPageProps = {
    activeTab: MainAppTabId;
    onTabChange: (tab: MainAppTabId) => void;
    onVoicePress?: () => void;
};

export default function SettingsPage({
    activeTab,
    onTabChange,
    onVoicePress,
}: SettingsPageProps) {
    const insets = useSafeAreaInsets();
    const navHeight = 72;
    const { settings, updateSettings } = useUserSettings();

    const pickAvatar = useCallback(async () => {
        if (!settings.cameraEnabled) return;
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        if (res.canceled || !res.assets[0]) return;
        updateSettings({ profileImageUri: res.assets[0].uri });
    }, [settings.cameraEnabled, updateSettings]);

    return (
        <SafeAreaView
            className="flex-1 bg-[#f7f7f7]"
            edges={["top", "left", "right"]}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: insets.bottom + navHeight + 56,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Text
                    className="font-josefin-bold text-[22px]"
                    style={{ color: TITLE }}
                >
                    Settings
                </Text>
                <Text className="mt-1 font-josefin text-[12px] text-[#888]">
                    Profile, Maple&apos;s notes, and what Crave can use on your device.
                </Text>

                <Text className="mt-6 font-josefin-bold text-[13px] text-[#444]">
                    Profile
                </Text>
                <View className="mt-2 flex-row items-center gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm shadow-black/5">
                    <RipplePressable
                        borderRadius={999}
                        onPress={pickAvatar}
                        disabled={!settings.cameraEnabled}
                        className="h-20 w-20 overflow-hidden rounded-full border border-[#ececec] bg-[#f0f0f0]"
                    >
                        {settings.profileImageUri ? (
                            <Image
                                source={{ uri: settings.profileImageUri }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="h-full w-full items-center justify-center">
                                <FontAwesome name="user" size={36} color="#bbb" />
                            </View>
                        )}
                    </RipplePressable>
                    <View className="flex-1">
                        <Text className="font-josefin-bold text-[14px] text-[#2c2c2c]">
                            Profile photo
                        </Text>
                        <Text className="mt-1 font-josefin text-[11px] text-[#888]">
                            Tap to choose from your library. Requires Camera &amp; Photos
                            access to be enabled below.
                        </Text>
                    </View>
                </View>

                <Text className="mt-6 font-josefin-bold text-[13px] text-[#444]">
                    Maple&apos;s notes
                </Text>
                <Text className="mt-1 font-josefin text-[11px] text-[#888]">
                    Preferences captured from Maple (voice sessions) are stored here. Edit
                    anytime — this is what Crave uses to personalize suggestions.
                </Text>
                <TextInput
                    value={settings.mapleNotes}
                    onChangeText={(t) => updateSettings({ mapleNotes: t })}
                    multiline
                    textAlignVertical="top"
                    placeholder="Your dining preferences…"
                    placeholderTextColor={MUTED}
                    className="mt-2 min-h-[140px] rounded-2xl border border-[#ececec] bg-white px-3 py-3 font-josefin text-[13px] text-[#2c2c2c]"
                />

                <Text className="mt-6 font-josefin-bold text-[13px] text-[#444]">
                    Services &amp; permissions
                </Text>
                <View className="mt-2 overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5">
                    <ServiceRow
                        icon={MapPin}
                        title="Apple Maps"
                        subtitle="Directions and distance to restaurants"
                        value={settings.appleMapsEnabled}
                        onValueChange={(v) => updateSettings({ appleMapsEnabled: v })}
                    />
                    <ServiceRow
                        icon={Camera}
                        title="Camera &amp; library"
                        subtitle="Profile photo and receipt uploads"
                        value={settings.cameraEnabled}
                        onValueChange={(v) => updateSettings({ cameraEnabled: v })}
                    />
                    <ServiceRow
                        icon={Mic}
                        title="Microphone"
                        subtitle="Talk to Maple and voice ordering"
                        value={settings.microphoneEnabled}
                        onValueChange={(v) => updateSettings({ microphoneEnabled: v })}
                    />
                    <ServiceRow
                        icon={Bell}
                        title="Notifications"
                        subtitle="Reservation updates and group activity"
                        value={settings.notificationsEnabled}
                        onValueChange={(v) =>
                            updateSettings({ notificationsEnabled: v })
                        }
                        last
                    />
                </View>

                <RipplePressable
                    borderRadius={16}
                    className="mt-6 flex-row items-center justify-center gap-2 bg-[#ececec] py-3.5"
                    onPress={() => {}}
                >
                    <FontAwesome name="shield" size={14} color="#555" />
                    <Text className="font-josefin-bold text-[12px] text-[#555]">
                        Privacy policy
                    </Text>
                </RipplePressable>
            </ScrollView>

            <VoiceAssistantFab
                onPress={onVoicePress ?? (() => {})}
                style={{ bottom: insets.bottom + navHeight + 8 }}
            />

            <View
                className="absolute bottom-0 left-0 right-0 bg-transparent pt-1"
                style={{ paddingBottom: insets.bottom }}
            >
                <MainAppBottomNav activeTab={activeTab} onTabChange={onTabChange} />
            </View>
        </SafeAreaView>
    );
}

function ServiceRow({
    icon: Icon,
    title,
    subtitle,
    value,
    onValueChange,
    last,
}: {
    icon: typeof MapPin;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    last?: boolean;
}) {
    return (
        <View
            className={`flex-row items-center gap-3 px-4 py-3.5 ${
                last ? "" : "border-b border-[#f0f0f0]"
            }`}
        >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff3e7]">
                <Icon size={18} color={ORANGE} strokeWidth={2.2} />
            </View>
            <View className="min-w-0 flex-1">
                <Text className="font-josefin-bold text-[13px] text-[#2c2c2c]">
                    {title}
                </Text>
                <Text className="mt-0.5 font-josefin text-[11px] text-[#888]">
                    {subtitle}
                </Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: TRACK_OFF, true: ORANGE }}
                thumbColor="#ffffff"
                ios_backgroundColor={TRACK_OFF}
            />
        </View>
    );
}
