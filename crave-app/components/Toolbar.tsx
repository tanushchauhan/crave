import { View } from "react-native";

type ToolbarProps = {
    variant?: "light" | "transparent";
};

export default function Toolbar({ variant = "light" }: ToolbarProps) {
    const bgClass = variant === "light" ? "bg-white" : "bg-transparent";
    return (
        <View
            className={`pt-14 items-center pb-4 border-b border-[#d1d1d1] ${bgClass}`}
        >
            {/* <Logo width={170} height={62} /> */}
        </View>
    );
}
