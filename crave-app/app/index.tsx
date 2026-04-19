import FinishSetupHome from "@/pages/FinishSetupHome";
import OnboardingFlow from "@/pages/OnboardingFlow";
import { logAuthSession } from "@/lib/authDebug";
import { markSetupComplete, readSetupCompleteMarker } from "@/lib/setupGate";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

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
                const [{ data }, setupComplete] = await Promise.all([
                    supabase.auth.getSession(),
                    readSetupCompleteMarker(),
                ]);
                if (cancelled) {
                    return;
                }
                if (data.session) {
                    logAuthSession("getSession (focused)", data.session);
                }
                setStage(resolveStage(!!data.session, setupComplete));
                setReady(true);
            })();

            return () => {
                cancelled = true;
            };
        }, []),
    );

    useEffect(() => {
        const applyFromAuth = (session: boolean, setupComplete: boolean) => {
            setStage(resolveStage(session, setupComplete));
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void readSetupCompleteMarker().then((setupComplete) => {
                applyFromAuth(!!session, setupComplete);
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
                    await markSetupComplete();
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
