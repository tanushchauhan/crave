import MainAppBottomNav, {
    type MainAppTabId,
} from "@/components/MainAppBottomNav";
import AddGroupModal from "@/components/AddGroupModal";
import OrderNowModal from "@/components/OrderNowModal";
import MainAppPageHeader from "@/components/MainAppPageHeader";
import RestaurantRecommendationCard from "@/components/RestaurantRecommendationCard";
import VoiceAssistantFab from "@/components/VoiceAssistantFab";
import { DEFAULT_RESTAURANT, type Restaurant } from "@/constants/orderingMockData";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
                    />
                    <RestaurantRecommendationCard
                        restaurant={DEFAULT_RESTAURANT}
                        onOrderPress={handleOrderPress}
                        onMorePress={() => {}}
                    />
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
