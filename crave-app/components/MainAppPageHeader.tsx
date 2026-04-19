import { ReactNode } from "react";
import { Text, View } from "react-native";

const TITLE_ORANGE = "#ff904b";

type MainAppPageHeaderProps = {
    title: string;
    /** Optional icon (e.g. waffle). Title aligns with other tabs when omitted but space is reserved. */
    icon?: ReactNode;
    subtitle?: string;
    /** Match horizontal alignment with icon+title screens when this screen has no icon */
    reserveLeadingSpace?: boolean;
    bottomBorder?: boolean;
    /** e.g. px-4 when the scroll view has no horizontal padding */
    contentInsetClassName?: string;
    /** Recommendations-style: centered title */
    align?: "left" | "center";
};

/**
 * Shared page title row for main tabs so titles sit on the same baseline when switching tabs.
 */
export default function MainAppPageHeader({
    title,
    icon,
    subtitle,
    reserveLeadingSpace = false,
    bottomBorder = false,
    contentInsetClassName = "",
    align = "left",
}: MainAppPageHeaderProps) {
    const leading =
        icon ??
        (reserveLeadingSpace ? <View className="h-9 w-9" /> : null);

    const borderClass = bottomBorder ? "border-b border-[#e5e5e5]" : "";

    if (align === "center" && !icon) {
        return (
            <View
                className={`pb-2 pt-4 ${borderClass} ${contentInsetClassName}`}
            >
                <Text
                    className="text-center font-josefin-bold text-[18px] leading-[22px]"
                    style={{ color: TITLE_ORANGE }}
                    numberOfLines={2}
                >
                    {title}
                </Text>
                {subtitle ? (
                    <Text className="mt-1 text-center font-josefin text-[12px] text-[#888]">
                        {subtitle}
                    </Text>
                ) : null}
            </View>
        );
    }

    return (
        <View className={`pb-2 pt-4 ${borderClass} ${contentInsetClassName}`}>
            <View className="flex-row items-center gap-2">
                {leading}
                <Text
                    className="font-josefin-bold text-[18px] leading-[22px]"
                    style={{ color: TITLE_ORANGE, flex: 1 }}
                    numberOfLines={2}
                >
                    {title}
                </Text>
            </View>
            {subtitle ? (
                <Text
                    className={`mt-1 font-josefin text-[12px] text-[#888] ${
                        leading ? "pl-[44px]" : ""
                    }`}
                >
                    {subtitle}
                </Text>
            ) : null}
        </View>
    );
}
