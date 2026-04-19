import { Text, View } from "react-native";

type OnboardingStepIndicatorProps = {
    steps: number;
    currentStep: number; // 1-indexed
};

export default function OnboardingStepIndicator({
    steps,
    currentStep,
}: OnboardingStepIndicatorProps) {
    return (
        <View className="flex-row items-center justify-center">
            {Array.from({ length: steps }).map((_, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isLast = stepNumber === steps;

                return (
                    <View key={stepNumber} className="flex-row items-center">
                        <View
                            className={`h-10 w-10 items-center justify-center rounded-full ${
                                isActive ? "bg-[#f5861f]" : "bg-[#dfdfdf]"
                            }`}
                        >
                            <Text
                                className={`font-bold ${
                                    isActive ? "text-white" : "text-[#a1a1a1]"
                                }`}
                            >
                                {stepNumber}
                            </Text>
                        </View>
                        {!isLast && (
                            <View className="mx-3 flex-row">
                                <View className="mx-1 h-2.5 w-2.5 rounded-full bg-[#cfcfcf]" />
                                <View className="mx-1 h-2.5 w-2.5 rounded-full bg-[#cfcfcf]" />
                                <View className="mx-1 h-2.5 w-2.5 rounded-full bg-[#cfcfcf]" />
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}
