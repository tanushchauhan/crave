import Dish from "@/assets/canva/assets/3.svg";
import Input from "@/components/Input";
import OnboardingLayout from "@/components/OnboardingLayout";
import VerticalStack from "@/components/VerticalStack";
import { parseToE164 } from "@/lib/phone";
import { Phone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type OnboardingPageTwoProps = {
    initialPhone?: string;
    onSendOtpAndContinue: (raw: string) => Promise<string | null>;
    onBack?: () => void;
};

export default function OnboardingPageTwo({
    initialPhone = "",
    onSendOtpAndContinue,
    onBack,
}: OnboardingPageTwoProps) {
    const [phone, setPhone] = useState(initialPhone);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (initialPhone) {
            setPhone(initialPhone);
        }
    }, [initialPhone]);

    const valid = parseToE164(phone).ok;

    const handleNext = useCallback(async () => {
        setError(null);
        setSending(true);
        try {
            const err = await onSendOtpAndContinue(phone);
            if (err) {
                setError(err);
            }
        } finally {
            setSending(false);
        }
    }, [onSendOtpAndContinue, phone]);

    return (
        <OnboardingLayout
            currentStep={2}
            onNext={handleNext}
            onBack={onBack}
            nextDisabled={!valid || sending}
            hero={<Dish width={240} height={200} />}
        >
            <VerticalStack gap={12}>
                <Input
                    icon={Phone}
                    placeholder="e.g. (682) 252-2215 or +1…"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(t) => {
                        setPhone(t);
                        setError(null);
                    }}
                />
                {error ? (
                    <Text className="text-[#ff3131] font-josefin-bold text-[12px] px-1">
                        {error}
                    </Text>
                ) : null}
                {sending ? (
                    <View className="flex-row items-center gap-2 px-1">
                        <ActivityIndicator color="#f5861f" />
                        <Text className="text-[#888] font-josefin-bold text-[12px]">
                            Sending code…
                        </Text>
                    </View>
                ) : null}
            </VerticalStack>
        </OnboardingLayout>
    );
}
