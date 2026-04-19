import FinishSetupHome from "@/pages/FinishSetupHome";
import OnboardingFlow from "@/pages/OnboardingFlow";
import { logAuthSession } from "@/lib/authDebug";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
    /** Remount OnboardingFlow when returning from tabs/setup so step 0 (welcome + tip) shows again. */
    const [onboardingRemountKey, setOnboardingRemountKey] = useState(0);
    const prevStageRef = useRef<Stage | null>(null);

    /** Re-read session whenever this screen is shown (e.g. after `router.replace("/")` from Log out). */
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            void (async () => {
                const [{ data }, setupRaw] = await Promise.all([
                    supabase.auth.getSession(),
                    AsyncStorage.getItem(SETUP_KEY),
                ]);
                if (cancelled) {
                    return;
                }
                if (data.session) {
                    logAuthSession("getSession (focused)", data.session);
                }
                const setupComplete = setupRaw === "1";
                setStage(resolveStage(!!data.session, setupComplete));
                setReady(true);
            })();

            return () => {
                cancelled = true;
            };
        }, []),
    );

    useEffect(() => {
        const applyFromAuth = (session: boolean, setupRaw: string | null) => {
            const setupComplete = setupRaw === "1";
            setStage(resolveStage(session, setupComplete));
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void AsyncStorage.getItem(SETUP_KEY).then((setupRaw) => {
                applyFromAuth(!!session, setupRaw);
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const prev = prevStageRef.current;
        prevStageRef.current = stage;
        if (
            stage === "onboarding" &&
            (prev === "done" || prev === "setup")
        ) {
            setOnboardingRemountKey((k) => k + 1);
        }
    }, [stage]);

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

    return (
        <OnboardingFlow
            key={onboardingRemountKey}
            onComplete={() => setStage("setup")}
        />
    );
}
