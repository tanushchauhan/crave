import AnimatedCookingDots from "@/components/AnimatedCookingDots";
import FinishButton from "@/components/FinishButton";
import FoodCuisineCard from "@/components/FoodCuisineCard";
import Toolbar from "@/components/Toolbar";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

type FinishSelectFoodsProps = {
    onBack?: () => void;
    onFinished?: () => void;
};

type CuisineSelection = "none" | "liked" | "disliked";

type Cuisine = {
    id: string;
    title: string;
    subtitle: string;
};

const CUISINES: Cuisine[] = [
    {
        id: "indian-1",
        title: "Indian Cuisine",
        subtitle: "e.g Tikka Masala, Butter Chicken",
    },
    {
        id: "indian-2",
        title: "Indian Cuisine",
        subtitle: "e.g Tikka Masala, Butter Chicken",
    },
    { id: "italian", title: "Italian Cuisine", subtitle: "e.g Pasta, Pizza, Risotto" },
    { id: "japanese", title: "Japanese Cuisine", subtitle: "e.g Sushi, Ramen, Tempura" },
    { id: "mexican", title: "Mexican Cuisine", subtitle: "e.g Tacos, Burritos, Enchiladas" },
    { id: "thai", title: "Thai Cuisine", subtitle: "e.g Pad Thai, Green Curry" },
];

function CuisineImagePlaceholder() {
    return (
        <View className="flex-1 w-full items-center justify-center bg-[#dedede]">
            <FontAwesome5 name="image" size={40} color="#9a9a9a" solid />
        </View>
    );
}

export default function FinishSelectFoods({
    onBack,
    onFinished,
}: FinishSelectFoodsProps) {
    const [selections, setSelections] = useState<
        Record<string, CuisineSelection>
    >({
        "indian-1": "liked",
        "indian-2": "disliked",
    });

    const cycle = (id: string) => {
        setSelections((prev) => {
            const current = prev[id] ?? "none";
            const next: CuisineSelection =
                current === "none"
                    ? "liked"
                    : current === "liked"
                      ? "disliked"
                      : "none";
            return { ...prev, [id]: next };
        });
    };

    return (
        <View className="flex-1 bg-white">
            <Toolbar />

            <View className="flex-row items-center justify-between px-4 pt-3">
                <TouchableOpacity
                    onPress={onBack}
                    activeOpacity={0.8}
                    className="h-9 w-9 items-center justify-center rounded-full bg-[#f2f2f2]"
                >
                    <FontAwesome name="arrow-left" size={14} color="#444" />
                </TouchableOpacity>
                <View className="flex-row items-center">
                    <View className="h-7 w-7 rounded-full bg-[#3ab54a] items-center justify-center -mr-2 border-2 border-white">
                        <FontAwesome name="check" size={12} color="white" />
                    </View>
                    <View className="h-7 w-7 rounded-full bg-[#c4c4c4] items-center justify-center border-2 border-white">
                        <FontAwesome name="close" size={12} color="white" />
                    </View>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <View className="flex-row flex-wrap justify-between gap-y-3">
                    {CUISINES.map((c) => {
                        const state = selections[c.id] ?? "none";
                        return (
                            <FoodCuisineCard
                                key={c.id}
                                title={c.title}
                                subtitle={c.subtitle}
                                selected={state === "liked"}
                                rejected={state === "disliked"}
                                image={<CuisineImagePlaceholder />}
                                onPress={() => cycle(c.id)}
                            />
                        );
                    })}
                </View>

                <View className="mt-8 flex-row items-center justify-center gap-3">
                    <AnimatedCookingDots color="#a6a6a6" dotSize={10} gap={8} />
                    <Text className="font-josefin-bold text-[15px] text-[#a6a6a6]">
                        Thinking...
                    </Text>
                </View>
            </ScrollView>

            <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-[#ececec] px-4 pt-3 pb-6 flex-row items-center">
                <Text className="flex-1 text-[10px] text-[#888] leading-[14px]">
                    This Is An Infinite Customization Panel. Press Finished When
                    You Feel Like You&rsquo;ve Selected Enough
                </Text>
                <FinishButton onPress={onFinished} />
            </View>
        </View>
    );
}
