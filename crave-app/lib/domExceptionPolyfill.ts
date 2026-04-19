/**
 * Hermes/React Native does not provide a global `DOMException`, but
 * livekit-client (a transitive dep of `@elevenlabs/react-native`) references
 * it at module load time. Importing this file before any LiveKit/ElevenLabs
 * import installs a minimal shim so the bundle can evaluate.
 *
 * @see https://github.com/livekit/client-sdk-js/issues/1871
 */
const g = globalThis as unknown as {
    DOMException?: unknown;
    atob?: (s: string) => string;
    btoa?: (s: string) => string;
};

if (typeof g.DOMException === "undefined") {
    class DOMExceptionShim extends Error {
        code: number;
        constructor(message?: string, name?: string) {
            super(message);
            this.name = name ?? "Error";
            this.code = 0;
        }
    }
    g.DOMException = DOMExceptionShim;
}

// Hermes ships strict atob/btoa, but the JWT room-name parsing in
// `@elevenlabs/react-native` calls atob on JWT segments. Add a tolerant
// shim only if atob is missing entirely.
if (typeof g.atob !== "function") {
    const ALPHA =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    g.atob = (input: string): string => {
        let str = input.replace(/=+$/, "");
        let output = "";
        if (str.length % 4 === 1) {
            throw new Error("atob: invalid input");
        }
        for (
            let bc = 0, bs = 0, buffer: number, i = 0;
            (buffer = str.charCodeAt(i++));
            ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
                ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
                : 0
        ) {
            buffer = ALPHA.indexOf(String.fromCharCode(buffer));
        }
        return output;
    };
}

export {};
