import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

type Extra = {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
};

function resolveSupabaseUrl(): string {
    const fromPublic = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    if (fromPublic) {
        return fromPublic;
    }
    const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
    const fromExtra = extra.supabaseUrl?.trim();
    if (fromExtra) {
        return fromExtra;
    }
    return "";
}

function resolveSupabaseAnon(): string {
    const fromPublic = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (fromPublic) {
        return fromPublic;
    }
    const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
    const fromExtra = extra.supabaseAnonKey?.trim();
    if (fromExtra) {
        return fromExtra;
    }
    return "";
}

const url = resolveSupabaseUrl();
const anon = resolveSupabaseAnon();

const hasConfig = Boolean(url && anon);

if (!hasConfig) {
    console.warn(
        "[crave-app] Missing Supabase URL/anon: set EXPO_PUBLIC_SUPABASE_* or SUPABASE_URL + SUPABASE_ANON_KEY in monorepo root .env (see crave-app/README.md).",
    );
}

// createClient throws on empty URL; use placeholders only so the bundle loads — auth still fails until env is set.
const resolvedUrl = hasConfig ? url : "https://placeholder.supabase.co";
const resolvedAnon = hasConfig
    ? anon
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase = createClient(resolvedUrl, resolvedAnon, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: hasConfig,
        persistSession: hasConfig,
        detectSessionInUrl: false,
    },
});
