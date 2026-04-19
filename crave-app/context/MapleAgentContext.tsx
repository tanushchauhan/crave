import {
    ElevenLabsProvider,
    useConversation,
} from "@elevenlabs/react-native";
import {
    ensureAgentAudioSession,
    reinforceAgentAudioRouting,
} from "@/lib/liveKitAgentAudio";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { resolveElevenLabsAgentConfig } from "@/lib/elevenLabsAgent";
import { supabase } from "@/lib/supabase";
import { useUserSettings } from "@/context/UserSettingsContext";

/**
 * Must match the ElevenLabs webhook header dynamic variable name(s) for `Authorization`.
 * `secret__*` is recommended by ElevenLabs so the token is not injected into LLM-visible
 * prompt text; we send both so existing dashboards keep working.
 */
const SUPABASE_AUTH_DYNAMIC_VARS = [
    "crave_supabase_authorization",
    "secret__crave_supabase_authorization",
] as const;

/** JWT only (starts with `eyJ…`) — no `Bearer ` prefix. ElevenLabs injects this into the
 *  webhook `Authorization` header as-is; crave-bedrock-proxy `normalizeBearer()` adds
 *  `Bearer ` when forwarding to Supabase. Including `Bearer` in the dynamic var breaks auth. */
function rawJwtForWebhookDynamicVar(token: string): string {
    return token.trim().replace(/^Bearer\s+/i, "").trim();
}

export type MapleAgentStatus =
    | "disconnected"
    | "connecting"
    | "connected"
    | "error";

type MapleAgentContextValue = {
    /** Toggle between starting and ending the agent session. */
    toggle: () => void;
    /** Force-end the session (no-op if not active). */
    end: () => void;
    /** True from the moment startSession is invoked until disconnect resolves. */
    isActive: boolean;
    /** True once the agent itself is talking back. */
    isSpeaking: boolean;
    /** Underlying connection status. */
    status: MapleAgentStatus;
    /** True once `onConnect` has fired for the current session. */
    isConnected: boolean;
    /** Last error (if any). */
    errorMessage: string | null;
    /** Whether the env vars / agent id are present. */
    isAvailable: boolean;
};

const MapleAgentContext = createContext<MapleAgentContextValue | null>(null);

const NOOP_VALUE: MapleAgentContextValue = {
    toggle: () => {},
    end: () => {},
    isActive: false,
    isSpeaking: false,
    status: "disconnected",
    isConnected: false,
    errorMessage: null,
    isAvailable: false,
};

export function MapleAgentProvider({ children }: { children: ReactNode }) {
    const config = useMemo(() => resolveElevenLabsAgentConfig(), []);

    if (!config) {
        return (
            <MapleAgentContext.Provider value={NOOP_VALUE}>
                {children}
            </MapleAgentContext.Provider>
        );
    }

    return (
        <ElevenLabsProvider>
            <MapleAgentInner agentId={config.agentId}>{children}</MapleAgentInner>
        </ElevenLabsProvider>
    );
}

function MapleAgentInner({
    agentId,
    children,
}: {
    agentId: string;
    children: ReactNode;
}) {
    const { settings } = useUserSettings();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const startedRef = useRef(false);

    // Voice tools (resolve_group, recommend_restaurants, place_order, confirm_booking)
    // are webhook tools in the ElevenLabs dashboard — ElevenLabs servers POST to your
    // API Gateway URLs; no clientTools registration is required in the app.
    const conversation = useConversation({
        onConnect: () => {
            setErrorMessage(null);
            setIsConnected(true);
            reinforceAgentAudioRouting();
            // Nudges the model away from “tools not enabled” hallucinations when the
            // dashboard system prompt was older or mixed client vs server tool wording.
            try {
                conversation.sendContextualUpdate(
                    "CRAVE mobile session is active and signed in. Server webhook tools resolve_group, recommend_restaurants, place_order, and confirm_booking are available for this conversation; use them whenever the user needs live data or to place a booking or order.",
                );
            } catch {
                /* non-fatal */
            }
        },
        onDisconnect: () => {
            startedRef.current = false;
            setIsActive(false);
            setIsConnected(false);
        },
        onError: (msg, ctx) => {
            console.warn("[MapleAgent] onError", msg, ctx);
            setErrorMessage(typeof msg === "string" ? msg : "Connection error");
        },
    });

    const status = conversation.status as MapleAgentStatus;
    const isSpeaking = conversation.isSpeaking;

    const dynamicVariables = useMemo(() => {
        const notes = settings.mapleNotes?.trim() ?? "";
        const lastCtx = settings.mapleVoiceLastContext;
        const lastPrefs = lastCtx?.preferenceLines?.length
            ? lastCtx.preferenceLines.join(" • ")
            : "(none)";
        return {
            user_maple_notes: notes || "(none)",
            user_recent_preferences: lastPrefs,
            user_apple_maps_enabled: String(settings.appleMapsEnabled),
            user_microphone_enabled: String(settings.microphoneEnabled),
            user_notifications_enabled: String(settings.notificationsEnabled),
        };
    }, [settings]);

    const start = useCallback(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        setErrorMessage(null);
        setIsActive(true);
        void (async () => {
            try {
                // Must run before LiveKit's internal `startAudioSession` (triggered
                // when the conversation token / id is set inside `startSession`).
                await ensureAgentAudioSession();

                const { data: sessionData, error: sessionErr } =
                    await supabase.auth.getSession();
                const accessToken = sessionData.session?.access_token?.trim();
                if (sessionErr || !accessToken) {
                    throw new Error(
                        "Sign in required — voice tools need your account session.",
                    );
                }

                const rawJwt = rawJwtForWebhookDynamicVar(accessToken);
                const authDynamicEntries = Object.fromEntries(
                    SUPABASE_AUTH_DYNAMIC_VARS.map((k) => [k, rawJwt]),
                );

                await conversation.startSession({
                    agentId,
                    dynamicVariables: {
                        ...dynamicVariables,
                        ...authDynamicEntries,
                    },
                });
            } catch (err) {
                startedRef.current = false;
                setIsActive(false);
                setIsConnected(false);
                setErrorMessage(
                    err instanceof Error ? err.message : "Failed to start",
                );
            }
        })();
    }, [agentId, conversation, dynamicVariables]);

    const end = useCallback(() => {
        if (!startedRef.current) {
            setIsActive(false);
            return;
        }
        startedRef.current = false;
        setIsActive(false);
        void conversation.endSession("user").catch(() => {
            /* ignore */
        });
    }, [conversation]);

    const toggle = useCallback(() => {
        if (isActive || status === "connecting" || status === "connected") {
            end();
        } else {
            start();
        }
    }, [isActive, status, end, start]);

    const value = useMemo<MapleAgentContextValue>(
        () => ({
            toggle,
            end,
            isActive,
            isSpeaking,
            status,
            isConnected,
            errorMessage,
            isAvailable: true,
        }),
        [toggle, end, isActive, isSpeaking, status, isConnected, errorMessage],
    );

    return (
        <MapleAgentContext.Provider value={value}>
            {children}
        </MapleAgentContext.Provider>
    );
}

export function useMapleAgent(): MapleAgentContextValue {
    const ctx = useContext(MapleAgentContext);
    if (!ctx) {
        throw new Error("useMapleAgent must be used within MapleAgentProvider");
    }
    return ctx;
}
