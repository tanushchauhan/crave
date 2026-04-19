import FinishSetupHome from "@/pages/FinishSetupHome";
import OnboardingFlow from "@/pages/OnboardingFlow";
import { logAuthSession } from "@/lib/authDebug";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const SETUP_KEY = "crave.setup.complete";

type Stage = "loading" | "onboarding" | "setup" | "done";

function resolveStage(session: boolean, setupComplete: boolean): Exclude<Stage, "loading"> {
    if (session && setupComplete) {
        return "done";
    }
    if (session) {
        return "setup";
    }
    return "onboarding";
}

export default function Index() {
    const [ready, setReady] = useState(false);
    const [stage, setStage] = useState<Stage>("loading");

    useEffect(() => {
        let cancelled = false;

        const applyRouting = (session: boolean, setupRaw: string | null) => {
            if (cancelled) {
                return;
            }
            const setupComplete = setupRaw === "1";
            setStage(resolveStage(session, setupComplete));
        };

        const init = async () => {
            const [{ data }, setupRaw] = await Promise.all([
                supabase.auth.getSession(),
                AsyncStorage.getItem(SETUP_KEY),
            ]);
            if (data.session) {
                logAuthSession("getSession (restored)", data.session);
            }
            applyRouting(!!data.session, setupRaw);
            if (!cancelled) {
                setReady(true);
            }
        };

        void init();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void AsyncStorage.getItem(SETUP_KEY).then((setupRaw) => {
                applyRouting(!!session, setupRaw);
            });
        });

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    if (!ready || stage === "loading") {
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

    return <OnboardingFlow onComplete={() => setStage("setup")} />;
}
