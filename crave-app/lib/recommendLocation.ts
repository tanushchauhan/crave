export type RecommendLatLng = {
    latitude: number;
    longitude: number;
};

/**
 * One-shot foreground location for the recommendations Edge call.
 * Returns null if permission denied, unavailable, or on error (caller keeps non-geo RPC behavior).
 *
 * Loads `expo-location` via dynamic import so the recommendations screen does not crash if the
 * native dev client was built before `expo-location` was added — run `npx expo run:ios` (or
 * Android) again after adding native modules.
 */
export async function getRecommendGeoForRequest(): Promise<RecommendLatLng | null> {
    try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            return null;
        }
        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        return { latitude, longitude };
    } catch {
        return null;
    }
}
