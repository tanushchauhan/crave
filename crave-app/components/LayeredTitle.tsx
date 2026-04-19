import { Text } from "react-native";

type LayeredTitleProps = {
    children: string;
    fillColor?: string;
    shadowColor?: string;
    fontSize?: number;
    className?: string;
};

export default function LayeredTitle({
    children,
    fillColor = "white",
    shadowColor = "#3a1b05",
    fontSize = 80,
    className,
}: LayeredTitleProps) {
    return (
        <Text
            className={`font-black ${className ?? ""}`}
            style={{
                fontSize,
                lineHeight: fontSize * 0.95,
                color: fillColor,
                textShadowColor: shadowColor,
                textShadowOffset: { width: 4, height: 4 },
                textShadowRadius: 0,
            }}
        >
            {children}
        </Text>
    );
}
