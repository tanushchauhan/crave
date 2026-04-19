import AsyncStorage from "@react-native-async-storage/async-storage";

/** Same key as `app/index.tsx` routing: first-run checklist finished. */
export const SETUP_COMPLETE_STORAGE_KEY = "crave.setup.complete";

export async function readSetupCompleteMarker(): Promise<boolean> {
    const v = await AsyncStorage.getItem(SETUP_COMPLETE_STORAGE_KEY);
    return v === "1";
}

export async function markSetupComplete(): Promise<void> {
    await AsyncStorage.setItem(SETUP_COMPLETE_STORAGE_KEY, "1");
}

/** Removes the marker so the next root route treats setup as incomplete (while session exists → Finish Setup). */
export async function clearSetupCompleteMarker(): Promise<void> {
    await AsyncStorage.removeItem(SETUP_COMPLETE_STORAGE_KEY);
}
