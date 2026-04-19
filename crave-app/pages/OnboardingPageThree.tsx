import Pasta from "@/assets/canva/assets/4.svg";
import Button from "@/components/Button";
import OnboardingLayout from "@/components/OnboardingLayout";
import VerticalStack from "@/components/VerticalStack";
import { useState } from "react";
import { Text } from "react-native";
import { OtpInput } from "react-native-otp-entry";

type OnboardingPageThreeProps = {
    onNext?: () => void;
    onBack?: () => void;
    onResend?: () => void;
};

export default function OnboardingPageThree({
    onNext,
    onBack,
    onResend,
}: OnboardingPageThreeProps) {
    const [code, setCode] = useState("");

    return (
        <OnboardingLayout
            currentStep={3}
            onNext={onNext}
            onBack={onBack}
            hero={<Pasta width={240} height={200} />}
        >
            <VerticalStack gap={12}>
                <Text className="text-[14px] font-josefin-bold text-[#d9d9d9] tracking-wide">
                    One-Time Code
                </Text>

                <OtpInput
                    numberOfDigits={6}
                    focusColor={"orange"}
                    theme={{
                        pinCodeTextStyle: {
                            fontSize: 18,
                            color: "#333",
                            fontFamily: "JosefinSans-Regular",
                        },
                    }}
                />

                <Button
                    label="Resend Code"
                    className="bg-[#d9d9d9]"
                    isLoading={false}
                    onPress={onResend}
                />
            </VerticalStack>
        </OnboardingLayout>
    );
}
