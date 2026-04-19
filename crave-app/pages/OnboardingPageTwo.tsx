import Dish from "@/assets/canva/assets/3.svg";
import Input from "@/components/Input";
import OnboardingLayout from "@/components/OnboardingLayout";
import VerticalStack from "@/components/VerticalStack";
import { AlertCircle, Lock, Phone } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

type OnboardingPageTwoProps = {
    onNext?: () => void;
    onBack?: () => void;
};

const SPECIAL_CHARS = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]/;

export default function OnboardingPageTwo({
    onNext,
    onBack,
}: OnboardingPageTwoProps) {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const showPasswordError =
        password.length > 0 && !SPECIAL_CHARS.test(password);

    return (
        <OnboardingLayout
            currentStep={2}
            onNext={onNext}
            onBack={onBack}
            hero={<Dish width={240} height={200} />}
        >
            <VerticalStack gap={12}>
                <Input
                    icon={Phone}
                    placeholder="e.g +1 (682) - 252 - 2215"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                />
                <Input
                    icon={Lock}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                {showPasswordError && (
                    <View className="flex-row items-center mt-1 pl-2">
                        <AlertCircle
                            size={14}
                            color="#ff3131"
                            style={{ marginRight: 6 }}
                            strokeWidth={3}
                        />
                        <Text className="text-[#ff3131] font-josefin-bold text-[12px] font-semibold">
                            Password Needs To Have Special Characters
                        </Text>
                    </View>
                )}
            </VerticalStack>
        </OnboardingLayout>
    );
}
