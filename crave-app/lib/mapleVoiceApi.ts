import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

type MapleVoiceResponse = {
    transcript: string;
    lines: string[];
    error?: string;
    detail?: string;
};

/** Base URL for crave-http (API Gateway → bedrock-proxy), no trailing slash. */
export function resolveAwsApiBase(): string {
    const extra = (Constants.expoConfig?.extra ?? {}) as { craveAwsApiBase?: string };
    const fromExtra = extra.craveAwsApiBase?.trim();
    if (fromExtra) {
        return fromExtra.replace(/\/$/, "");
    }
    const pub = process.env.EXPO_PUBLIC_CRAVE_AWS_API_BASE?.trim();
    if (pub) {
        return pub.replace(/\/$/, "");
    }
    return "";
}

/**
 * Sends a short audio clip to API Gateway → crave-bedrock-proxy POST /voice/maple-setup
 * (Amazon Transcribe batch job on S3, then Bedrock Claude for preference lines).
 */
export async function postMapleVoiceSetupChunk(input: {
    audioBase64: string;
    mediaFormat: string;
    existingNotes: string;
}): Promise<MapleVoiceResponse> {
    const base = resolveAwsApiBase();
    if (!base) {
        throw new Error(
            "Set EXPO_PUBLIC_CRAVE_AWS_API_BASE (or craveAwsApiBase in app.config extra) to your crave-http API URL.",
        );
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session) {
        throw new Error("Sign in required for Maple voice.");
    }
    const token = sessionData.session.access_token;

    const url = `${base}/voice/maple-setup`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            audio_base64: input.audioBase64,
            media_format: input.mediaFormat,
            existing_notes: input.existingNotes,
        }),
    });

    const text = await res.text();
    let json: unknown;
    try {
        json = JSON.parse(text) as Record<string, unknown>;
    } catch {
        throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
    }

    const o = json as Record<string, unknown>;
    if (!res.ok) {
        const msg =
            typeof o.detail === "string"
                ? o.detail
                : typeof o.message === "string"
                  ? o.message
                  : typeof o.error === "string"
                    ? o.error
                    : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    const lines = Array.isArray(o.lines) ? (o.lines as unknown[]).map((x) => String(x)) : [];
    const transcript = typeof o.transcript === "string" ? o.transcript : "";
    return { transcript, lines };
}
