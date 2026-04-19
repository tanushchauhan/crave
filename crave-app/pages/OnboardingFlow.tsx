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
    const width = Dimensions.get("window").width;
    const translateX = useSharedValue(0);

    useEffect(() => {
        translateX.value = withSpring(-step * width, SPRING);
    }, [step, width, translateX]);

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const go = useCallback((i: number) => {
        setStep(Math.max(0, Math.min(2, i)));
    }, []);

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
                        onNext={() => go(2)}
                        onBack={() => go(0)}
                    />
                </View>
                <View style={{ width }} className="flex-1">
                    <OnboardingPageThree
                        onNext={onComplete}
                        onBack={() => go(1)}
                    />
                </View>
            </Animated.View>
        </View>
    );
}
