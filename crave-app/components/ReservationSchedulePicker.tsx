import type { Restaurant } from "@/constants/orderingMockData";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const ORANGE = "#f5861f";
const MUTED = "#a6a6a6";

export function startOfLocalDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function sameLocalDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function buildSlotsForDay(
    day: Date,
    now: Date,
    win: Restaurant["reservation"],
): Date[] {
    const dayStart = startOfLocalDay(day);
    const todayStart = startOfLocalDay(now);
    if (dayStart.getTime() < todayStart.getTime()) return [];
    const isToday = sameLocalDay(day, now);
    const slots: Date[] = [];
    const { windowStartMinute, windowEndMinute, slotMinutes } = win;
    for (let m = windowStartMinute; m <= windowEndMinute; m += slotMinutes) {
        const dt = new Date(dayStart);
        dt.setHours(Math.floor(m / 60), m % 60, 0, 0);
        if (isToday && dt.getTime() <= now.getTime()) continue;
        slots.push(dt);
    }
    return slots;
}

export function getNextReservationSlot(now: Date, restaurant: Restaurant): Date {
    const { reservation } = restaurant;
    for (let dayOffset = 0; dayOffset < 21; dayOffset++) {
        const day = new Date(now);
        day.setDate(day.getDate() + dayOffset);
        const slots = buildSlotsForDay(day, now, reservation);
        if (slots.length > 0) return slots[0]!;
    }
    const fallback = new Date(now);
    fallback.setMinutes(fallback.getMinutes() + 30, 0, 0);
    return fallback;
}

function formatTimeLabel(d: Date): string {
    return d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatMonthYear(d: Date): string {
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

type ReservationSchedulePickerProps = {
    restaurant: Restaurant;
    selected: Date | null;
    onChange: (d: Date) => void;
};

export default function ReservationSchedulePicker({
    restaurant,
    selected,
    onChange,
}: ReservationSchedulePickerProps) {
    const now = useMemo(() => new Date(), []);
    const [monthAnchor, setMonthAnchor] = useState(() => {
        const base = selected ?? getNextReservationSlot(new Date(), restaurant);
        return new Date(base.getFullYear(), base.getMonth(), 1);
    });

    useEffect(() => {
        if (!selected) return;
        setMonthAnchor(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }, [selected]);

    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStart = startOfLocalDay(new Date());

    const calendarCells = useMemo(() => {
        const cells: { day: number | null; date: Date | null }[] = [];
        for (let i = 0; i < firstDow; i += 1) {
            cells.push({ day: null, date: null });
        }
        for (let d = 1; d <= daysInMonth; d += 1) {
            const date = new Date(year, month, d);
            cells.push({ day: d, date });
        }
        return cells;
    }, [firstDow, daysInMonth, year, month]);

    const slotsForSelectedDay = useMemo(() => {
        if (!selected) return [];
        return buildSlotsForDay(selected, new Date(), restaurant.reservation);
    }, [selected, restaurant.reservation]);

    const onPickDay = useCallback(
        (date: Date) => {
            const slots = buildSlotsForDay(date, new Date(), restaurant.reservation);
            if (slots.length === 0) return;
            const match =
                selected && sameLocalDay(selected, date)
                    ? slots.find((s) => s.getTime() === selected.getTime()) ??
                      slots[0]
                    : slots[0];
            onChange(match!);
        },
        [onChange, restaurant.reservation, selected],
    );

    return (
        <View className="mt-2 rounded-2xl border border-[#ececec] bg-[#fafafa] p-3">
            <Text className="font-josefin-bold text-[11px] text-[#666]">
                Pick a date & time ({restaurant.menuHoursLine})
            </Text>

            <View className="mt-2 flex-row items-center justify-between">
                <Pressable
                    onPress={() =>
                        setMonthAnchor(new Date(year, month - 1, 1))
                    }
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-full bg-white"
                >
                    <ChevronLeft size={18} color="#444" strokeWidth={2} />
                </Pressable>
                <Text className="font-josefin-bold text-[13px] text-[#2c2c2c]">
                    {formatMonthYear(monthAnchor)}
                </Text>
                <Pressable
                    onPress={() =>
                        setMonthAnchor(new Date(year, month + 1, 1))
                    }
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-full bg-white"
                >
                    <ChevronRight size={18} color="#444" strokeWidth={2} />
                </Pressable>
            </View>

            <View className="mt-2 flex-row flex-wrap">
                {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
                    <View key={`${l}-${i}`} className="w-[14.28%] items-center py-1">
                        <Text className="font-josefin-bold text-[9px] text-[#999]">
                            {l}
                        </Text>
                    </View>
                ))}
                {calendarCells.map((cell, idx) => {
                    if (!cell.date || cell.day === null) {
                        return (
                            <View
                                key={`empty-${idx}`}
                                className="w-[14.28%] items-center py-1"
                            />
                        );
                    }
                    const disabled =
                        startOfLocalDay(cell.date).getTime() < todayStart.getTime();
                    const hasSlots =
                        !disabled &&
                        buildSlotsForDay(
                            cell.date,
                            new Date(),
                            restaurant.reservation,
                        ).length > 0;
                    const sel =
                        selected &&
                        sameLocalDay(selected, cell.date) &&
                        hasSlots;
                    return (
                        <View
                            key={`${year}-${month}-${cell.day}`}
                            className="w-[14.28%] items-center py-1"
                        >
                            <TouchableOpacity
                                onPress={() => hasSlots && onPickDay(cell.date!)}
                                disabled={!hasSlots}
                                activeOpacity={0.85}
                                className="h-8 w-8 items-center justify-center rounded-full"
                                style={{
                                    backgroundColor: sel
                                        ? ORANGE
                                        : hasSlots
                                          ? "#fff"
                                          : "transparent",
                                    opacity: hasSlots ? 1 : 0.35,
                                }}
                            >
                                <Text
                                    className="font-josefin-bold text-[12px]"
                                    style={{
                                        color: sel
                                            ? "#fff"
                                            : hasSlots
                                              ? "#333"
                                              : MUTED,
                                    }}
                                >
                                    {cell.day}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            <Text className="mt-3 font-josefin-bold text-[11px] text-[#666]">
                Available times
            </Text>
            {slotsForSelectedDay.length === 0 ? (
                <View className="mt-2 flex-row items-center gap-2 rounded-xl bg-[#fff3e7] px-3 py-2">
                    <FontAwesome name="info-circle" size={14} color={ORANGE} />
                    <Text className="flex-1 font-josefin text-[11px] text-[#555]">
                        No open slots this day. Choose another date or a later day.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-2"
                    contentContainerStyle={{ gap: 8 }}
                >
                    {slotsForSelectedDay.map((slot) => {
                        const active =
                            selected && slot.getTime() === selected.getTime();
                        return (
                            <TouchableOpacity
                                key={slot.toISOString()}
                                onPress={() => onChange(slot)}
                                activeOpacity={0.88}
                                className="rounded-full px-3 py-2"
                                style={{
                                    backgroundColor: active ? ORANGE : "#fff",
                                    borderWidth: active ? 0 : 1,
                                    borderColor: "#ddd",
                                }}
                            >
                                <Text
                                    className="font-josefin-bold text-[12px]"
                                    style={{ color: active ? "#fff" : "#333" }}
                                >
                                    {formatTimeLabel(slot)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
