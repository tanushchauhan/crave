import FinishSetupHome from "@/pages/FinishSetupHome";
import OnboardingFlow from "@/pages/OnboardingFlow";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const ONBOARDING_KEY = "crave.onboarding.complete";
const SETUP_KEY = "crave.setup.complete";

type Stage = "onboarding" | "setup" | "done";

export default function Index() {
    const [ready, setReady] = useState(false);
    const [stage, setStage] = useState<Stage>("onboarding");

    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(ONBOARDING_KEY),
            AsyncStorage.getItem(SETUP_KEY),
        ])
            .then(([onboarded, setup]) => {
                if (setup === "1") {
                    setStage("done");
                } else if (onboarded === "1") {
                    setStage("setup");
                } else {
                    setStage("onboarding");
                }
            })
            .finally(() => setReady(true));
    }, []);

    if (!ready) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#f5861f" />
            </View>
        );
    }

    if (stage === "done") {
        return <Redirect href="/(tabs)" />;
    }

    if (stage === "setup") {
        return (
            <FinishSetupHome
                onComplete={async () => {
                    await AsyncStorage.setItem(SETUP_KEY, "1");
                    setStage("done");
                }}
            />
        );
    }

    return (
        <OnboardingFlow
            onComplete={async () => {
                await AsyncStorage.setItem(ONBOARDING_KEY, "1");
                setStage("setup");
            }}
        />
    );
}
