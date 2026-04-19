import Constants from "expo-constants";

export type ElevenLabsAgentConfig = {
    agentId: string;
    apiKey: string | null;
};

type Extra = {
    elevenLabsAgentId?: string;
    elevenLabsApiKey?: string;
};

/** Resolve from app.config `extra` first (build-time inlined), then EXPO_PUBLIC_* fallbacks. */
export function resolveElevenLabsAgentConfig(): ElevenLabsAgentConfig | null {
    const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
    const agentId =
        (extra.elevenLabsAgentId ?? "").trim() ||
        (process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID ?? "").trim();
    if (!agentId) {
        return null;
    }
    const apiKey =
        (extra.elevenLabsApiKey ?? "").trim() ||
        (process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? "").trim();
    return {
        agentId,
        apiKey: apiKey ? apiKey : null,
    };
}

/**
 * Mint a short-lived signed URL for a private agent using the public REST endpoint.
 * Only call this when an apiKey is available — never embed secrets in distributed builds.
 *
 * @see https://elevenlabs.io/docs/api-reference/conversational-ai/get-signed-url
 */
export async function fetchElevenLabsSignedUrl(
    agentId: string,
    apiKey: string,
): Promise<string> {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`;
    const res = await fetch(url, {
        method: "GET",
        headers: { "xi-api-key": apiKey },
    });
    const text = await res.text();
    if (!res.ok) {
        let detail = text;
        try {
            const json = JSON.parse(text) as { detail?: { message?: string } | string };
            if (typeof json.detail === "string") detail = json.detail;
            else if (json.detail && typeof json.detail.message === "string") {
                detail = json.detail.message;
            }
        } catch {
            /* keep raw */
        }
        throw new Error(detail.slice(0, 240) || `HTTP ${res.status}`);
    }
    let parsed: { signed_url?: string };
    try {
        parsed = JSON.parse(text) as { signed_url?: string };
    } catch {
        throw new Error("Invalid signed URL response");
    }
    const signed = parsed.signed_url;
    if (!signed) {
        throw new Error("Signed URL missing in response");
    }
    return signed;
}
