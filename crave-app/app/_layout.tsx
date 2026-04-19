import "../global.css";
import "react-native-gesture-handler";

import {
    JosefinSans_100Thin,
    JosefinSans_100Thin_Italic,
    JosefinSans_300Light,
    JosefinSans_300Light_Italic,
    JosefinSans_400Regular,
    JosefinSans_400Regular_Italic,
    JosefinSans_700Bold,
    JosefinSans_700Bold_Italic,
} from "@expo-google-fonts/josefin-sans";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { UserSettingsProvider } from "@/context/UserSettingsContext";
import { MapleAgentProvider } from "@/context/MapleAgentContext";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
    initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        JosefinSans_100Thin,
        JosefinSans_300Light,
        JosefinSans_400Regular,
        JosefinSans_700Bold,
        JosefinSans_100Thin_Italic,
        JosefinSans_300Light_Italic,
        JosefinSans_400Regular_Italic,
        JosefinSans_700Bold_Italic,
    });

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
        if (error) throw error;
    }, [error]);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return <RootLayoutNav />;
}

function RootLayoutNav() {
    const colorScheme = useColorScheme();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <UserSettingsProvider>
                    <MapleAgentProvider>
                        <ThemeProvider
                            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                        >
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen name="(tabs)" />
                                <Stack.Screen
                                    name="modal"
                                    options={{ presentation: "modal", headerShown: false }}
                                />
                            </Stack>
                        </ThemeProvider>
                    </MapleAgentProvider>
                </UserSettingsProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
