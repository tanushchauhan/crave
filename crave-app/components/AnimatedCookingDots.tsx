import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

type AnimatedCookingDotsProps = {
    color?: string;
    dotSize?: number;
    gap?: number;
};

export default function AnimatedCookingDots({
    color = "#f5861f",
    dotSize = 14,
    gap = 10,
}: AnimatedCookingDotsProps) {
    const dotAnimations = useRef([
        new Animated.Value(0.35),
        new Animated.Value(0.35),
        new Animated.Value(0.35),
    ]).current;

    useEffect(() => {
        const loops = dotAnimations.map((value, index) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 180),
                    Animated.timing(value, {
                        toValue: 1,
                        duration: 420,
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0.35,
                        duration: 420,
                        useNativeDriver: true,
                    }),
                ]),
            ),
        );

        loops.forEach((loop) => loop.start());

        return () => {
            loops.forEach((loop) => loop.stop());
        };
    }, [dotAnimations]);

    return (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
            {dotAnimations.map((animation, index) => (
                <Animated.View
                    key={index}
                    style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: color,
                        marginHorizontal: gap / 2,
                        opacity: animation,
                        transform: [
                            {
                                scale: animation.interpolate({
                                    inputRange: [0.35, 1],
                                    outputRange: [0.88, 1.12],
                                }),
                            },
                        ],
                    }}
                />
            ))}
        </View>
    );
}
