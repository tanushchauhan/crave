import { useRef } from "react";
import { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, View } from "react-native";

type OtpInputProps = {
    length?: number;
    value: string;
    onChange: (next: string) => void;
};

export default function OtpInput({
    length = 5,
    value,
    onChange,
}: OtpInputProps) {
    const inputsRef = useRef<Array<TextInput | null>>([]);

    const handleChange = (index: number, text: string) => {
        const sanitized = text.replace(/\D/g, "");

        if (!sanitized) {
            const chars = value.split("");
            chars[index] = "";
            onChange(chars.join("").padEnd(length, "").trimEnd());
            return;
        }

        const chars = value.padEnd(length, " ").split("");
        for (let i = 0; i < sanitized.length && index + i < length; i++) {
            chars[index + i] = sanitized[i];
        }
        const next = chars.join("").replace(/\s+$/g, "");
        onChange(next);

        const nextIndex = Math.min(index + sanitized.length, length - 1);
        inputsRef.current[nextIndex]?.focus();
    };

    const handleKeyPress = (
        index: number,
        e: NativeSyntheticEvent<TextInputKeyPressEventData>
    ) => {
        if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    return (
        <View className="flex-row items-center rounded-full bg-white border border-[#e3e3e3] px-4 h-14 justify-center">
            {Array.from({ length }).map((_, i) => (
                <TextInput
                    key={i}
                    ref={(ref) => {
                        inputsRef.current[i] = ref;
                    }}
                    value={value[i] ?? ""}
                    onChangeText={(t) => handleChange(i, t)}
                    onKeyPress={(e) => handleKeyPress(i, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    className="mx-2 w-6 text-center text-[22px] font-bold text-[#333]"
                />
            ))}
        </View>
    );
}
