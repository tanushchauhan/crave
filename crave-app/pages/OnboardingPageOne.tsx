import ProduceBox from "@/assets/canva/assets/2.svg";
import Callout from "@/components/Callout";
import OnboardingLayout from "@/components/OnboardingLayout";

type OnboardingPageOneProps = {
    onNext?: () => void;
    onBack?: () => void;
};

export default function OnboardingPageOne({
    onNext,
    onBack,
}: OnboardingPageOneProps) {
    return (
        <OnboardingLayout
            currentStep={1}
            onNext={onNext}
            onBack={onBack}
            backDisabled={!onBack}
            hero={<ProduceBox width={280} height={240} />}
        >
            <Callout text="Crave is your personal dining assistant app that automates the dining experience for yourself. The on-boarding process is whatever whatever." />
        </OnboardingLayout>
    );
}
