import Waffle from "@/assets/canva/assets/6.svg";
import MenuItemCard from "@/components/MenuItemCard";
import type { MenuItem, Restaurant } from "@/constants/orderingMockData";
import { DEFAULT_RESTAURANT } from "@/constants/orderingMockData";
import { cn } from "@/lib/utils";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Clock, MapPin, Mic, MicOff, Search } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    ImageBackground,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type OrderingPageProps = {
    restaurant?: Restaurant;
    onBack?: () => void;
    onCheckout?: (summary: {
        restaurant: Restaurant;
        items: { item: MenuItem; quantity: number }[];
        subtotal: number;
    }) => void;
};

export default function OrderingPage({
    restaurant = DEFAULT_RESTAURANT,
    onBack,
    onCheckout,
}: OrderingPageProps) {
    const insets = useSafeAreaInsets();
    const [cart, setCart] = useState<Record<string, number>>({});
    const [activeCategoryId, setActiveCategoryId] = useState<string>(
        restaurant.menu[0]?.id ?? "",
    );
    const [search, setSearch] = useState("");
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [voiceListening, setVoiceListening] = useState(false);

    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!voiceListening) {
            pulse1.stopAnimation();
            pulse2.stopAnimation();
            return;
        }
        const makeLoop = (value: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(value, {
                        toValue: 1,
                        duration: 1400,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(value, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            );
        const l1 = makeLoop(pulse1, 0);
        const l2 = makeLoop(pulse2, 700);
        l1.start();
        l2.start();
        return () => {
            l1.stop();
            l2.stop();
        };
    }, [voiceListening, pulse1, pulse2]);

    const pulseStyle = (v: Animated.Value) => ({
        opacity: v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 0],
        }),
        transform: [
            {
                scale: v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.2],
                }),
            },
        ],
    });

    const add = (item: MenuItem) =>
        setCart((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }));

    const remove = (item: MenuItem) =>
        setCart((c) => {
            const next = { ...c };
            const current = next[item.id] ?? 0;
            if (current <= 1) delete next[item.id];
            else next[item.id] = current - 1;
            return next;
        });

    const { totalCount, subtotal, cartItems } = useMemo(() => {
        const flatItems = restaurant.menu.flatMap((c) => c.items);
        let count = 0;
        let sum = 0;
        const detailed: { item: MenuItem; quantity: number }[] = [];
        for (const item of flatItems) {
            const q = cart[item.id] ?? 0;
            if (q > 0) {
                count += q;
                sum += q * item.price;
                detailed.push({ item, quantity: q });
            }
        }
        return { totalCount: count, subtotal: sum, cartItems: detailed };
    }, [cart, restaurant.menu]);

    const menuTags = useMemo(() => {
        const set = new Set<string>();
        for (const cat of restaurant.menu) {
            for (const it of cat.items) {
                for (const t of it.tags ?? []) {
                    if (t.trim()) set.add(t.trim());
                }
            }
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [restaurant.menu]);

    const activeCategory = useMemo(
        () => restaurant.menu.find((c) => c.id === activeCategoryId),
        [restaurant.menu, activeCategoryId],
    );

    const filteredItems = useMemo(() => {
        let items = activeCategory?.items ?? [];
        const q = search.trim().toLowerCase();
        if (q) {
            items = items.filter(
                (i) =>
                    i.name.toLowerCase().includes(q) ||
                    i.description.toLowerCase().includes(q),
            );
        }
        if (tagFilter) {
            items = items.filter((i) => i.tags?.includes(tagFilter));
        }
        return items;
    }, [activeCategory, search, tagFilter]);

    return (
        <SafeAreaView
            className="flex-1 bg-[#f7f7f7]"
            edges={["top", "left", "right"]}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingBottom: insets.bottom + (totalCount > 0 ? 88 : 24),
                }}
                showsVerticalScrollIndicator={false}
            >
                <ImageBackground
                    source={{ uri: restaurant.heroImage }}
                    className="h-[180px] w-full"
                    resizeMode="cover"
                >
                    <View className="flex-1 justify-between p-3">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={onBack}
                                className="h-9 w-9 items-center justify-center rounded-full bg-black/45"
                                accessibilityRole="button"
                                accessibilityLabel="Back"
                            >
                                <FontAwesome
                                    name="arrow-left"
                                    size={14}
                                    color="white"
                                />
                            </TouchableOpacity>
                            <View className="flex-row flex-wrap gap-2">
                                {restaurant.cuisines.map((c) => (
                                    <View
                                        key={c}
                                        className="flex-row items-center gap-1 rounded-full bg-black/45 px-2.5 py-1"
                                    >
                                        <MapPin size={10} color="#ffffff" />
                                        <Text className="font-josefin text-[11px] text-white">
                                            {c}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </ImageBackground>

                <View className="border-b border-[#ececec] bg-white px-4 pb-3 pt-3">
                    <View className="flex-row items-start justify-between gap-2">
                        <View className="min-w-0 flex-1 pr-2">
                            <Text
                                className="font-josefin-bold text-[20px]"
                                style={{ color: "#ff751f" }}
                            >
                                Menu Display
                            </Text>
                            <Text className="mt-0.5 font-josefin text-[12px] text-[#a6a6a6]">
                                For {restaurant.name}, {restaurant.cityLabel}
                            </Text>
                            <View className="mt-2 flex-row items-center gap-1.5">
                                <Clock size={14} color="#f5861f" strokeWidth={2} />
                                <Text className="font-josefin text-[12px] text-[#434343]">
                                    {restaurant.menuHoursLine}
                                </Text>
                            </View>
                        </View>
                        <View className="items-center">
                            <View className="flex-row items-start gap-2 rounded-2xl border border-[#f0e6dc] bg-[#fffaf5] px-2 py-2">
                                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fff3e7]">
                                    <Waffle width={22} height={24} />
                                </View>
                                <View className="items-center">
                                    <View className="h-[56px] w-[56px] items-center justify-center">
                                        <Animated.View
                                            pointerEvents="none"
                                            className="absolute h-[56px] w-[56px] rounded-full bg-[#f5861f]"
                                            style={pulseStyle(pulse1)}
                                        />
                                        <Animated.View
                                            pointerEvents="none"
                                            className="absolute h-[56px] w-[56px] rounded-full bg-[#f5861f]"
                                            style={pulseStyle(pulse2)}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setVoiceListening((v) => !v)}
                                            activeOpacity={0.88}
                                            className="h-[44px] w-[44px] items-center justify-center rounded-full shadow-md"
                                            style={{
                                                backgroundColor: "#f5861f",
                                                shadowColor: "#000",
                                                shadowOpacity: 0.18,
                                                shadowRadius: 5,
                                                elevation: 4,
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Talk to voice agent"
                                        >
                                            {voiceListening ? (
                                                <Mic
                                                    size={22}
                                                    color="#ffffff"
                                                    strokeWidth={2.4}
                                                />
                                            ) : (
                                                <MicOff
                                                    size={22}
                                                    color="#ffffff"
                                                    strokeWidth={2.4}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    <Text className="mt-1 text-center font-josefin-bold text-[8px] leading-[10px] text-[#a6a6a6]">
                                        Talk To Voice{"\n"}Agent
                                    </Text>
                                </View>
                            </View>
                            {voiceListening ? (
                                <Text className="mt-1 font-josefin-bold text-[9px] text-[#f5861f]">
                                    Listening…
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                    className="border-b border-[#ececec] bg-white py-3"
                >
                    {restaurant.menu.map((cat) => {
                        const active = cat.id === activeCategoryId;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => {
                                    setActiveCategoryId(cat.id);
                                    setTagFilter(null);
                                }}
                                className={cn(
                                    "rounded-full px-4 py-2",
                                    active ? "bg-[#f5861f]" : "bg-[#f0f0f0]",
                                )}
                            >
                                <Text
                                    className={cn(
                                        "font-josefin-bold text-[12px]",
                                        active ? "text-white" : "text-[#555]",
                                    )}
                                >
                                    {cat.title}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View className="border-b border-[#ececec] bg-white px-3 py-2.5">
                    <View className="flex-row items-center gap-2 rounded-full bg-[#f4f4f4] px-3 py-2">
                        <Search size={16} color="#a6a6a6" strokeWidth={2} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search this section…"
                            placeholderTextColor="#a6a6a6"
                            className="flex-1 py-0 font-josefin text-[13px] text-[#2c2c2c]"
                        />
                    </View>
                    {menuTags.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mt-2"
                            contentContainerStyle={{ gap: 8 }}
                        >
                            <TouchableOpacity
                                onPress={() => setTagFilter(null)}
                                className={cn(
                                    "rounded-full px-3 py-1.5",
                                    tagFilter === null
                                        ? "bg-[#2c2c2c]"
                                        : "bg-[#ececec]",
                                )}
                            >
                                <Text
                                    className={cn(
                                        "font-josefin-bold text-[11px]",
                                        tagFilter === null
                                            ? "text-white"
                                            : "text-[#555]",
                                    )}
                                >
                                    All items
                                </Text>
                            </TouchableOpacity>
                            {menuTags.map((t) => {
                                const on = tagFilter === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        onPress={() => setTagFilter(on ? null : t)}
                                        className={cn(
                                            "rounded-full px-3 py-1.5",
                                            on ? "bg-[#f5861f]" : "bg-[#ececec]",
                                        )}
                                    >
                                        <Text
                                            className={cn(
                                                "font-josefin-bold text-[11px]",
                                                on ? "text-white" : "text-[#555]",
                                            )}
                                        >
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : null}
                </View>

                <View className="gap-5 px-3 pt-3">
                    <View>
                        <Text className="mb-2 px-1 font-josefin-bold text-[15px] text-[#2c2c2c]">
                            {activeCategory?.title ?? "Menu"}
                        </Text>
                        {filteredItems.length === 0 ? (
                            <Text className="px-1 font-josefin text-[13px] text-[#888]">
                                No dishes match your search or filters in this section.
                            </Text>
                        ) : (
                            <View className="flex-row flex-wrap justify-between gap-y-2">
                                {filteredItems.map((item) => (
                                    <View key={item.id} style={{ width: "48%" }}>
                                        <MenuItemCard
                                            variant="grid"
                                            item={item}
                                            quantity={cart[item.id] ?? 0}
                                            onAdd={add}
                                            onRemove={remove}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {totalCount > 0 ? (
                <View
                    className="absolute bottom-0 left-0 right-0 border-t border-[#ececec] bg-white px-3 pt-2"
                    style={{ paddingBottom: Math.max(insets.bottom, 12) }}
                >
                    <View className="flex-row items-center justify-between gap-3">
                        <Text className="font-josefin-bold text-[12px] text-[#232320]">
                            {totalCount} Selected
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                onCheckout?.({
                                    restaurant,
                                    items: cartItems,
                                    subtotal,
                                })
                            }
                            activeOpacity={0.9}
                            className="rounded-full bg-[#f5861f] px-5 py-2.5 shadow-md shadow-black/20"
                        >
                            <Text className="font-josefin-bold text-[12px] text-white">
                                Finish Selection
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </SafeAreaView>
    );
}
