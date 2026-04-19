import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import MainAppPageHeader from "@/components/MainAppPageHeader";
import RipplePressable from "@/components/RipplePressable";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { useUserSettings } from "@/context/UserSettingsContext";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Bell, Camera, LogOut, MapPin, Mic, Settings } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const ORANGE = "#f5861f";
const MUTED = "#a6a6a6";
const TRACK_OFF = "#d0d0d0";

type SettingsPageProps = {
    activeTab: MainAppTabId;
    onTabChange: (tab: MainAppTabId) => void;
    onVoicePress?: () => void;
};

function accountLabelFromUser(user: {
    phone?: string | null;
    email?: string | null;
} | null): string {
    if (!user) {
        return "Not signed in";
    }
    if (user.phone) {
        return user.phone;
    }
    if (user.email) {
        return user.email;
    }
    return "Signed in";
}

export default function SettingsPage({
    activeTab,
    onTabChange,
    onVoicePress,
}: SettingsPageProps) {
    const insets = useSafeAreaInsets();
    const navHeight = 72;
    const { settings, updateSettings } = useUserSettings();
    const [accountLabel, setAccountLabel] = useState<string>("");
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const { data } = await supabase.auth.getUser();
            if (!cancelled) {
                setAccountLabel(accountLabelFromUser(data.user));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const confirmSignOut = useCallback(() => {
        Alert.alert(
            "Log out",
            "You will need to sign in again to use Crave.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log out",
                    style: "destructive",
                    onPress: () => {
                        void (async () => {
                            setSigningOut(true);
                            try {
                                const { error } = await supabase.auth.signOut();
                                if (error) {
                                    Alert.alert("Could not log out", error.message);
                                    return;
                                }
                                // Wait until local session is gone so index does not route to "setup" (FinishSetupHome).
                                for (let i = 0; i < 40; i++) {
                                    const { data } = await supabase.auth.getSession();
                                    if (!data.session) {
                                        break;
                                    }
                                    await new Promise((r) => setTimeout(r, 50));
                                }
                                router.replace("/");
                            } catch (e: unknown) {
                                const msg =
                                    e instanceof Error ? e.message : "Something went wrong";
                                Alert.alert("Could not log out", msg);
                            } finally {
                                setSigningOut(false);
                            }
                        })();
                    },
                },
            ],
        );
    }, []);

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
            edges={["left", "right"]}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 0,
                    paddingBottom: insets.bottom + navHeight + 56,
                }}
                showsVerticalScrollIndicator={false}
            >
                <MainAppPageHeader
                    title="Settings"
                    icon={
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#fff3e7]">
                            <Settings size={22} color={ORANGE} strokeWidth={2.2} />
                        </View>
                    }
                    subtitle="Profile, Maple's notes, account, and what Crave can use on your device."
                />

                <Text className="mt-6 font-josefin-bold text-[13px] text-[#444]">
                    Account
                </Text>
                <View className="mt-2 overflow-hidden rounded-2xl bg-white px-4 py-4 shadow-sm shadow-black/5">
                    <Text className="font-josefin text-[11px] uppercase tracking-wide text-[#888]">
                        Signed in as
                    </Text>
                    <Text
                        className="mt-1 font-josefin-bold text-[15px] text-[#2c2c2c]"
                        numberOfLines={2}
                    >
                        {accountLabel || "…"}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.88}
                        disabled={signingOut}
                        onPress={confirmSignOut}
                        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-[#f5861f]/40 bg-[#fff8f2] py-3.5"
                    >
                        {signingOut ? (
                            <ActivityIndicator size="small" color={ORANGE} />
                        ) : (
                            <LogOut size={18} color={ORANGE} strokeWidth={2.2} />
                        )}
                        <Text className="font-josefin-bold text-[13px]" style={{ color: ORANGE }}>
                            {signingOut ? "Signing out…" : "Log out"}
                        </Text>
                    </TouchableOpacity>
                </View>

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
                            Tap to choose from your library. Requires Camera and Photos access
                            to be enabled below.
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
                    Services and permissions
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
                        title="Camera and library"
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
