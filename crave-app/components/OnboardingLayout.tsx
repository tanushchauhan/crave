import OnboardingStepIndicator from "@/components/OnboardingStepIndicator";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type OnboardingLayoutProps = {
    currentStep: number;
    totalSteps?: number;
    hero: ReactNode;
    children: ReactNode;
    onNext?: () => void;
    onBack?: () => void;
    backDisabled?: boolean;
    nextDisabled?: boolean;
};

export default function OnboardingLayout({
    currentStep,
    totalSteps = 3,
    hero,
    children,
    onNext,
    onBack,
    backDisabled,
    nextDisabled,
}: OnboardingLayoutProps) {
    return (
        <View className="flex-1 bg-white">
            <View className="flex-1 items-center justify-center px-5">
                {hero}
            </View>

            <View className="rounded-t-[28px] bg-[#ececec] px-6 pt-8 pb-10">
                <Text className="text-center text-[42px] font-josefin-bold tracking-wide text-[#f5861f]">
                    Welcome to Crave
                </Text>

                <View className="mt-5">
                    <OnboardingStepIndicator
                        steps={totalSteps}
                        currentStep={currentStep}
                    />
                </View>

                <View className="mt-6">{children}</View>

                <View className="mt-8 flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={onBack}
                        disabled={backDisabled}
                        activeOpacity={0.85}
                        className={`flex-row items-center ${
                            backDisabled ? "opacity-40" : ""
                        }`}
                    >
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#d8d8d8] mr-3">
                            <ChevronLeft size={18} color="#a1a1a1" />
                        </View>
                        <Text className="text-xl font-josefin-bold text-[#c0c0c0]">
                            Back
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onNext}
                        disabled={nextDisabled}
                        activeOpacity={0.85}
                        className={`flex-row items-center ${
                            nextDisabled ? "opacity-40" : ""
                        }`}
                    >
                        <Text className="mr-3 text-xl font-josefin-bold text-[#f5861f]">
                            Next
                        </Text>
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#f5861f]">
                            <ChevronRight size={18} color="white" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
