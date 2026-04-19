import { cn } from "@/lib/utils";
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = TouchableOpacityProps & {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    className?: string;
    labelClassName?: string;
};

const variantStyles: Record<ButtonVariant, { button: string; label: string; spinner: string }> = {
    primary: {
        button: "bg-[#f5861f]",
        label: "text-white",
        spinner: "white",
    },
    secondary: {
        button: "bg-[#d9d9d9]",
        label: "text-[#555555]",
        spinner: "#555555",
    },
    ghost: {
        button: "bg-transparent border-2 border-[#f5861f]",
        label: "text-[#f5861f]",
        spinner: "#f5861f",
    },
};

const sizeStyles: Record<ButtonSize, { button: string; label: string; spinner: number }> = {
    sm: { button: "h-10 px-5",  label: "text-[14px]", spinner: 16 },
    md: { button: "h-12 px-6",  label: "text-[16px]", spinner: 18 },
    lg: { button: "h-14 px-8",  label: "text-[18px]", spinner: 20 },
};

export default function Button({
    label,
    variant = "primary",
    size = "md",
    isLoading = false,
    className,
    labelClassName,
    disabled,
    ...props
}: ButtonProps) {
    const v = variantStyles[variant];
    const s = sizeStyles[size];
    const isDisabled = disabled || isLoading;

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            disabled={isDisabled}
            className={cn(
                "rounded-full flex-row items-center justify-center",
                v.button,
                s.button,
                isDisabled && "opacity-50",
                className
            )}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator size={s.spinner} color={v.spinner} />
            ) : (
                <Text
                    className={cn(
                        "font-josefin-bold tracking-wide",
                        v.label,
                        s.label,
                        labelClassName
                    )}
                >
                    {label}
                </Text>
            )}
        </TouchableOpacity>
    );
}
