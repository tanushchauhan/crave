import { logAuthSession } from "@/lib/authDebug";
import { parseToE164 } from "@/lib/phone";
import { supabase } from "@/lib/supabase";
import OnboardingPageOne from "@/pages/OnboardingPageOne";
import OnboardingPageThree from "@/pages/OnboardingPageThree";
import OnboardingPageTwo from "@/pages/OnboardingPageTwo";
import { useCallback, useEffect, useState } from "react";
import { Dimensions, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

const SPRING = { damping: 22, stiffness: 210, mass: 0.85 };

type OnboardingFlowProps = {
    onComplete: () => void;
};

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const [step, setStep] = useState(0);
    const [phoneE164, setPhoneE164] = useState("");
    const width = Dimensions.get("window").width;
    const translateX = useSharedValue(0);

    useEffect(() => {
        translateX.value = withSpring(-step * width, SPRING);
    }, [step, width, translateX]);

    const go = useCallback((i: number) => {
        setStep(Math.max(0, Math.min(2, i)));
    }, []);

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const sendOtp = useCallback(
        async (raw: string): Promise<string | null> => {
            const parsed = parseToE164(raw);
            if (!parsed.ok) {
                return parsed.message;
            }
            const { error } = await supabase.auth.signInWithOtp({
                phone: parsed.e164,
                options: { shouldCreateUser: true },
            });
            if (error) {
                return error.message;
            }
            setPhoneE164(parsed.e164);
            return null;
        },
        [],
    );

    const handleSendOtpAndGoToOtp = useCallback(
        async (raw: string): Promise<string | null> => {
            const err = await sendOtp(raw);
            if (err) {
                return err;
            }
            go(2);
            return null;
        },
        [go, sendOtp],
    );

    const handleResend = useCallback(async (): Promise<string | null> => {
        if (!phoneE164) {
            return "Missing phone; go back and try again.";
        }
        const { error } = await supabase.auth.signInWithOtp({
            phone: phoneE164,
            options: { shouldCreateUser: true },
        });
        return error ? error.message : null;
    }, [phoneE164]);

    const handleVerifyOtp = useCallback(
        async (code: string): Promise<string | null> => {
            if (!phoneE164) {
                return "Missing phone; go back and try again.";
            }
            const { data, error } = await supabase.auth.verifyOtp({
                phone: phoneE164,
                token: code.replace(/\D/g, ""),
                type: "sms",
            });
            if (error) {
                return error.message;
            }
            logAuthSession("verifyOtp (signed in)", data.session);
            onComplete();
            return null;
        },
        [onComplete, phoneE164],
    );

    return (
        <View className="flex-1 overflow-hidden bg-white">
            <Animated.View
                className="flex-1 flex-row"
                style={[{ width: width * 3 }, slideStyle]}
            >
                <View style={{ width }} className="flex-1">
                    <OnboardingPageOne
                        onNext={() => go(1)}
                        onBack={undefined}
                    />
                </View>
                <View style={{ width }} className="flex-1">
                    <OnboardingPageTwo
                        initialPhone={phoneE164}
                        onSendOtpAndContinue={handleSendOtpAndGoToOtp}
                        onBack={() => go(0)}
                    />
                </View>
                <View style={{ width }} className="flex-1">
                    <OnboardingPageThree
                        onVerify={handleVerifyOtp}
                        onResend={handleResend}
                        onBack={() => go(1)}
                    />
                </View>
            </Animated.View>
        </View>
    );
}
