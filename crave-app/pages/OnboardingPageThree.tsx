import Pasta from "@/assets/canva/assets/4.svg";
import Button from "@/components/Button";
import OnboardingLayout from "@/components/OnboardingLayout";
import VerticalStack from "@/components/VerticalStack";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { OtpInput, type OtpInputRef } from "react-native-otp-entry";

type OnboardingPageThreeProps = {
    onVerify: (code: string) => Promise<string | null>;
    onResend?: () => Promise<string | null>;
    onBack?: () => void;
};

export default function OnboardingPageThree({
    onVerify,
    onResend,
    onBack,
}: OnboardingPageThreeProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [resendBusy, setResendBusy] = useState(false);
    const otpRef = useRef<OtpInputRef>(null);

    const digits = code.replace(/\D/g, "");

    const submit = useCallback(async () => {
        if (digits.length < 6) {
            return;
        }
        setError(null);
        setVerifying(true);
        try {
            const err = await onVerify(digits);
            if (err) {
                setError(err);
            }
        } finally {
            setVerifying(false);
        }
    }, [digits, onVerify]);

    const handleResend = useCallback(async () => {
        if (!onResend) {
            return;
        }
        setError(null);
        setResendBusy(true);
        try {
            const err = await onResend();
            if (err) {
                setError(err);
            } else {
                otpRef.current?.clear();
                setCode("");
            }
        } finally {
            setResendBusy(false);
        }
    }, [onResend]);

    return (
        <OnboardingLayout
            currentStep={3}
            onNext={submit}
            onBack={onBack}
            nextDisabled={digits.length < 6 || verifying}
            hero={<Pasta width={240} height={200} />}
        >
            <VerticalStack gap={12}>
                <Text className="text-[14px] font-josefin-bold text-[#d9d9d9] tracking-wide">
                    One-Time Code
                </Text>

                <OtpInput
                    ref={otpRef}
                    numberOfDigits={6}
                    type="numeric"
                    focusColor={"orange"}
                    onTextChange={(text) => {
                        setCode(text);
                        setError(null);
                    }}
                    theme={{
                        pinCodeTextStyle: {
                            fontSize: 18,
                            color: "#333",
                            fontFamily: "JosefinSans-Regular",
                        },
                    }}
                />

                {error ? (
                    <Text className="text-[#ff3131] font-josefin-bold text-[12px] px-1">
                        {error}
                    </Text>
                ) : null}
                {verifying ? (
                    <View className="flex-row items-center gap-2 px-1">
                        <ActivityIndicator color="#f5861f" />
                        <Text className="text-[#888] font-josefin-bold text-[12px]">
                            Verifying…
                        </Text>
                    </View>
                ) : null}

                <Button
                    label="Resend Code"
                    className="bg-[#d9d9d9]"
                    isLoading={resendBusy}
                    disabled={resendBusy}
                    onPress={handleResend}
                />
            </VerticalStack>
        </OnboardingLayout>
    );
}
