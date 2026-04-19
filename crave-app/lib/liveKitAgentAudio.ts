import { AudioSession } from "@livekit/react-native";

/**
 * Prepares the iOS/Android audio graph for ElevenLabs + LiveKit voice agents.
 *
 * LiveKit's docs stress that {@link AudioSession.configureAudio} and
 * {@link AudioSession.setAppleAudioConfiguration} must run **before**
 * {@link AudioSession.startAudioSession} / before joining a room. The ElevenLabs
 * SDK calls `startAudioSession` as soon as a conversation id exists, so we run
 * this immediately before `conversation.startSession(...)`.
 */
export async function ensureAgentAudioSession(): Promise<void> {
    try {
        await AudioSession.stopAudioSession();
    } catch {
        /* not started yet */
    }

    await AudioSession.configureAudio({
        ios: { defaultOutput: "speaker" },
    });

    await AudioSession.setAppleAudioConfiguration({
        audioCategory: "playAndRecord",
        audioMode: "voiceChat",
        audioCategoryOptions: [
            "defaultToSpeaker",
            "allowBluetooth",
            "allowBluetoothA2DP",
        ],
    });
}

/** Re-apply routing after tracks attach (iOS sometimes ignores pre-connect prefs). */
export function reinforceAgentAudioRouting(): void {
    requestAnimationFrame(() => {
        void (async () => {
            try {
                await AudioSession.setAppleAudioConfiguration({
                    audioCategory: "playAndRecord",
                    audioMode: "voiceChat",
                    audioCategoryOptions: [
                        "defaultToSpeaker",
                        "allowBluetooth",
                        "allowBluetoothA2DP",
                    ],
                });
                await AudioSession.selectAudioOutput("force_speaker");
                await AudioSession.setDefaultRemoteAudioTrackVolume(1);
            } catch {
                /* route picker may be unavailable */
            }
        })();
    });
}
