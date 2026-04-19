import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { CRAVE_LOGO_MARK } from "@/constants/recommendationFigmaAssets";
import { GroupsSessionProvider } from "@/context/GroupsSessionContext";
import { Tabs } from "expo-router";
import React from "react";
import { Dimensions, Image, View } from "react-native";

function HeaderLogo() {
    const w = Math.min(Math.round(Dimensions.get("window").width * 0.42), 168);
    return (
        <View className="flex-row min-h-[44px] items-center justify-center px-2">
            <Image
                source={{ uri: CRAVE_LOGO_MARK }}
                style={{ width: w, height: 44 }}
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
                    headerStyle: {
                        backgroundColor: "#ffffff",
                        borderBottomWidth: 0,
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
