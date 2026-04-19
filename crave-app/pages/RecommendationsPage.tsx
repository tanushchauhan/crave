import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import AddGroupModal from "@/components/AddGroupModal";
import OrderNowModal from "@/components/OrderNowModal";
import MainAppPageHeader from "@/components/MainAppPageHeader";
import RestaurantRecommendationCard from "@/components/RestaurantRecommendationCard";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { DEFAULT_RESTAURANT, type Restaurant } from "@/constants/orderingMockData";
import { getRecommendGeoForRequest } from "@/lib/recommendLocation";
import { fetchRestaurantRecommendations } from "@/lib/recommendationsApi";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import FinishSetupTalkToVoice from "./FinishSetupTalkToVoice";
import GroupsPage from "./GroupsPage";
import OrderingPage from "./OrderingPage";
import ReservationsPage from "./ReservationsPage";
import SettingsPage from "./SettingsPage";

type Screen =
    | { name: "recommendations" }
    | { name: "ordering"; restaurant: Restaurant }
    | { name: "groups" }
    | { name: "reservations" }
    | { name: "settings" };

export default function RecommendationsPage() {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] =
        useState<MainAppTabId>("recommendations");
    const [screen, setScreen] = useState<Screen>({ name: "recommendations" });
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
    const [orderModalRestaurant, setOrderModalRestaurant] =
        useState<Restaurant | null>(null);
    const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
    const [recLoading, setRecLoading] = useState(true);
    const [recError, setRecError] = useState<string | null>(null);
    const [usedNearMe, setUsedNearMe] = useState(false);

    useEffect(() => {
        if (screen.name !== "recommendations" || activeTab !== "recommendations") {
            return;
        }
        let cancelled = false;
        setRecLoading(true);
        setRecError(null);
        void (async () => {
            const geo = await getRecommendGeoForRequest();
            if (cancelled) {
                return;
            }
            setUsedNearMe(geo !== null);
            try {
                const rows = await fetchRestaurantRecommendations(
                    12,
                    geo
                        ? {
                              lat: geo.latitude,
                              lng: geo.longitude,
                          }
                        : null,
                );
                if (!cancelled) {
                    setRecommendations(rows);
                }
            } catch (e: unknown) {
                if (!cancelled) {
                    setRecError(
                        e instanceof Error ? e.message : "Failed to load",
                    );
                }
            } finally {
                if (!cancelled) {
                    setRecLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [screen.name, activeTab]);

    const onVoicePress = useCallback(() => {
        setVoiceOpen(true);
    }, []);

    const handleTabChange = useCallback((tab: MainAppTabId) => {
        setOrderModalRestaurant(null);
        setActiveTab(tab);
        if (tab === "recommendations") {
            setScreen({ name: "recommendations" });
        } else if (tab === "groups") {
            setScreen({ name: "groups" });
        } else if (tab === "reservations") {
            setScreen({ name: "reservations" });
        } else if (tab === "settings") {
            setScreen({ name: "settings" });
        }
    }, []);

    const handleOrderPress = useCallback((restaurant: Restaurant) => {
        setOrderModalRestaurant(restaurant);
    }, []);

    const openMenuFromOrderModal = useCallback((restaurant: Restaurant) => {
        setOrderModalRestaurant(null);
        setScreen({ name: "ordering", restaurant });
    }, []);

    const returnToRecommendations = useCallback(() => {
        setActiveTab("recommendations");
        setScreen({ name: "recommendations" });
    }, []);

    const navHeight = 72;

    if (voiceOpen) {
        return (
            <FinishSetupTalkToVoice
                onFinished={() => setVoiceOpen(false)}
            />
        );
    }

    if (screen.name === "ordering") {
        return (
            <OrderingPage
                restaurant={screen.restaurant}
                onBack={returnToRecommendations}
                onCheckout={returnToRecommendations}
            />
        );
    }

    if (screen.name === "groups") {
        return (
            <>
                <AddGroupModal
                    visible={addGroupModalOpen}
                    onClose={() => setAddGroupModalOpen(false)}
                />
                <GroupsPage
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onVoicePress={onVoicePress}
                    onAddGroup={() => setAddGroupModalOpen(true)}
                />
            </>
        );
    }

    if (screen.name === "reservations") {
        return (
            <ReservationsPage
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onVoicePress={onVoicePress}
            />
        );
    }

    if (screen.name === "settings") {
        return (
            <SettingsPage
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onVoicePress={onVoicePress}
            />
        );
    }

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={["left", "right"]}
        >
            <AddGroupModal
                visible={addGroupModalOpen}
                onClose={() => setAddGroupModalOpen(false)}
            />
            <OrderNowModal
                visible={orderModalRestaurant !== null}
                restaurant={orderModalRestaurant ?? DEFAULT_RESTAURANT}
                onClose={() => setOrderModalRestaurant(null)}
                onBrowseMenu={openMenuFromOrderModal}
            />
            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                        paddingBottom: insets.bottom + navHeight + 56,
                    }}
                    showsVerticalScrollIndicator
                >
                    <MainAppPageHeader
                        title="Recommendations For Today"
                        align="center"
                        contentInsetClassName="px-4"
                        subtitle={
                            usedNearMe && !recLoading && !recError
                                ? "Showing restaurants near you."
                                : undefined
                        }
                    />
                    {recLoading ? (
                        <View className="py-16 items-center justify-center">
                            <ActivityIndicator size="large" color="#f5861f" />
                            <Text className="mt-3 font-josefin text-[14px] text-[#888]">
                                Loading picks…
                            </Text>
                        </View>
                    ) : recError ? (
                        <View className="mx-4 mt-4 rounded-2xl bg-[#fff3e8] px-4 py-4">
                            <Text className="font-josefin-bold text-[15px] text-[#c45a00]">
                                Could not load recommendations
                            </Text>
                            <Text className="mt-2 font-josefin text-[13px] text-[#666]">
                                {recError}
                            </Text>
                            <TouchableOpacity
                                className="mt-3 self-start rounded-full bg-[#f5861f] px-4 py-2"
                                onPress={() => {
                                    setRecError(null);
                                    setRecLoading(true);
                                    void (async () => {
                                        const geo =
                                            await getRecommendGeoForRequest();
                                        setUsedNearMe(geo !== null);
                                        try {
                                            const rows =
                                                await fetchRestaurantRecommendations(
                                                    12,
                                                    geo
                                                        ? {
                                                              lat: geo.latitude,
                                                              lng: geo.longitude,
                                                          }
                                                        : null,
                                                );
                                            setRecommendations(rows);
                                        } catch (e: unknown) {
                                            setRecError(
                                                e instanceof Error
                                                    ? e.message
                                                    : "Failed to load",
                                            );
                                        } finally {
                                            setRecLoading(false);
                                        }
                                    })();
                                }}
                            >
                                <Text className="font-josefin-bold text-[14px] text-white">
                                    Retry
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : recommendations.length === 0 ? (
                        <View className="mx-4 mt-4">
                            <Text className="font-josefin text-[14px] text-[#666]">
                                No restaurants returned yet. Seed the project
                                (tools/supabase-seed) or check Supabase Auth is
                                signed in.
                            </Text>
                        </View>
                    ) : (
                        recommendations.map((r) => (
                            <RestaurantRecommendationCard
                                key={r.id}
                                restaurant={r}
                                onOrderPress={handleOrderPress}
                                onMorePress={() => {}}
                            />
                        ))
                    )}
                </ScrollView>

                <VoiceAssistantFab
                    onPress={onVoicePress}
                    style={{ bottom: insets.bottom + navHeight + 8 }}
                />

                <View
                    className="absolute bottom-0 left-0 right-0 bg-white pt-1"
                    style={{ paddingBottom: insets.bottom }}
                >
                    <MainAppBottomNav
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
