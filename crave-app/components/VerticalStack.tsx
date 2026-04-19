import React from "react";
import { View, ViewStyle } from "react-native";

type VerticalStackProps = {
    gap?: number; // spacing in pixels between children
    style?: ViewStyle | ViewStyle[];
    children?: React.ReactNode;
};

export default function VerticalStack({
    gap = 12,
    style,
    children,
}: VerticalStackProps) {
    const items = React.Children.toArray(children);

    return (
        <View style={style}>
            {items.map((child, i) => (
                <View key={i} style={{ marginTop: i === 0 ? 0 : gap }}>
                    {child}
                </View>
            ))}
        </View>
    );
}
