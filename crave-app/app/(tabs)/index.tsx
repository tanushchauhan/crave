import FocusSplash from "@/pages/FocusSplash";
import RecommendationsPage from "@/pages/RecommendationsPage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const SPLASH_DURATION_MS = 2600;

export default function TabOneScreen() {
    const [showSplash, setShowSplash] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    const triggerSplash = useCallback(() => {
        setShowSplash(true);

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }

        hideTimerRef.current = setTimeout(() => {
            setShowSplash(false);
            hideTimerRef.current = null;
        }, SPLASH_DURATION_MS);
    }, []);

    useFocusEffect(
        useCallback(() => {
            triggerSplash();

            return () => {
                if (hideTimerRef.current) {
                    clearTimeout(hideTimerRef.current);
                    hideTimerRef.current = null;
                }
            };
        }, [triggerSplash]),
    );

    useEffect(() => {
        const subscription = AppState.addEventListener(
            "change",
            (nextState) => {
                const previousState = appStateRef.current;
                appStateRef.current = nextState;

                const returnedToForeground =
                    (previousState === "inactive" ||
                        previousState === "background") &&
                    nextState === "active";

                if (returnedToForeground) {
                    triggerSplash();
                }
            },
        );

        return () => {
            subscription.remove();

            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };
    }, [triggerSplash]);

    if (showSplash) {
        return <FocusSplash />;
    }

    return <RecommendationsPage />;
}
