import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { CRAVE_LOGO_MARK } from "@/constants/recommendationFigmaAssets";
import { GroupsSessionProvider } from "@/context/GroupsSessionContext";
import { Tabs } from "expo-router";
import React from "react";
import { Dimensions, Image, View } from "react-native";

/** Matches page dividers (`MainAppPageHeader` / cards) for one consistent chrome. */
const HEADER_SEPARATOR = "#e5e5e5";

function HeaderLogo() {
    const winW = Dimensions.get("window").width;
    /** Centered wordmark — wider + taller than before for stronger presence in the nav bar. */
    const w = Math.min(Math.round(winW * 0.78), 340);
    const h = Math.min(Math.round(w * 0.38), 100);
    return (
        <View className="w-full flex-row items-center justify-center px-3 py-4">
            <Image
                source={{ uri: CRAVE_LOGO_MARK }}
                style={{ width: w, height: h }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                accessibilityLabel="Crave"
            />
        </View>
    );
}

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <GroupsSessionProvider>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
                    tabBarStyle: { display: "none" },
                    headerShown: true,
                    headerTitleAlign: "center",
                    headerTitle: () => <HeaderLogo />,
                    headerTitleContainerStyle: {
                        paddingHorizontal: 0,
                        paddingVertical: 0,
                        alignItems: "center",
                        justifyContent: "center",
                    },
                    headerStyle: {
                        backgroundColor: "#ffffff",
                        // Use a plain number — no `StyleSheet` import (avoids runtime errors in some bundles).
                        borderBottomWidth: 1,
                        borderBottomColor: HEADER_SEPARATOR,
                        shadowOpacity: 0,
                        elevation: 0,
                    },
                    headerShadowVisible: false,
                }}
            >
                <Tabs.Screen name="index" options={{ title: "" }} />
                <Tabs.Screen name="two" options={{ title: "" }} />
            </Tabs>
        </GroupsSessionProvider>
    );
}
