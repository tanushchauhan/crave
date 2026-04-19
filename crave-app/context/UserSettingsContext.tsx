import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

const STORAGE_KEY = "crave.user.settings.v1";

/** Snapshot from the last completed Maple voice setup session (Settings shows this). */
export type MapleVoiceLastContext = {
    finishedAt: string;
    preferenceLines: string[];
};

export type UserSettings = {
    profileImageUri: string | null;
    mapleNotes: string;
    mapleVoiceLastContext: MapleVoiceLastContext | null;
    appleMapsEnabled: boolean;
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    notificationsEnabled: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
    profileImageUri: null,
    mapleNotes:
        "Maple learns your tastes over time. Notes from voice sessions will appear here.",
    mapleVoiceLastContext: null,
    appleMapsEnabled: true,
    cameraEnabled: true,
    microphoneEnabled: true,
    notificationsEnabled: true,
};

type UserSettingsContextValue = {
    settings: UserSettings;
    hydrated: boolean;
    updateSettings: (patch: Partial<UserSettings>) => void;
    setMapleNotes: (text: string) => void;
    appendMapleLines: (lines: string[]) => void;
    setProfileImageUri: (uri: string | null) => void;
};

const UserSettingsContext = createContext<UserSettingsContextValue | null>(
    null,
);

async function loadSettings(): Promise<UserSettings> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        const ctx = merged.mapleVoiceLastContext;
        if (
            !ctx ||
            typeof ctx !== "object" ||
            typeof (ctx as MapleVoiceLastContext).finishedAt !== "string" ||
            !Array.isArray((ctx as MapleVoiceLastContext).preferenceLines)
        ) {
            merged.mapleVoiceLastContext = null;
        }
        return merged;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

async function storeSettings(s: UserSettings) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let cancelled = false;
        loadSettings().then((s) => {
            if (!cancelled) {
                setSettings(s);
                setHydrated(true);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const updateSettings = useCallback((patch: Partial<UserSettings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            void storeSettings(next);
            return next;
        });
    }, []);

    const setMapleNotes = useCallback((text: string) => {
        setSettings((prev) => {
            const next = { ...prev, mapleNotes: text };
            void storeSettings(next);
            return next;
        });
    }, []);

    const appendMapleLines = useCallback((lines: string[]) => {
        const block = lines.map((l) => l.trim()).filter(Boolean).join("\n");
        if (!block) return;
        setSettings((prev) => {
            const base = prev.mapleNotes.trim();
            const mapleNotes = base ? `${base}\n${block}` : block;
            const next = { ...prev, mapleNotes };
            void storeSettings(next);
            return next;
        });
    }, []);

    const setProfileImageUri = useCallback((uri: string | null) => {
        setSettings((prev) => {
            const next = { ...prev, profileImageUri: uri };
            void storeSettings(next);
            return next;
        });
    }, []);

    const value = useMemo(
        () => ({
            settings,
            hydrated,
            updateSettings,
            setMapleNotes,
            appendMapleLines,
            setProfileImageUri,
        }),
        [
            settings,
            hydrated,
            updateSettings,
            setMapleNotes,
            appendMapleLines,
            setProfileImageUri,
        ],
    );

    return (
        <UserSettingsContext.Provider value={value}>
            {children}
        </UserSettingsContext.Provider>
    );
}

export function useUserSettings(): UserSettingsContextValue {
    const ctx = useContext(UserSettingsContext);
    if (!ctx) {
        throw new Error("useUserSettings must be used within UserSettingsProvider");
    }
    return ctx;
}
