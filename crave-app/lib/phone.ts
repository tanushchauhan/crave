/** Normalize common US input to E.164 (+1…). Returns error message if invalid. */
export function parseToE164(raw: string): { ok: true; e164: string } | { ok: false; message: string } {
    const trimmed = raw.trim();
    if (!trimmed) {
        return { ok: false, message: "Enter your phone number" };
    }

    if (trimmed.startsWith("+")) {
        const digits = trimmed.slice(1).replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
            return { ok: false, message: "Enter a valid phone number with country code" };
        }
        return { ok: true, e164: `+${digits}` };
    }

    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) {
        return { ok: true, e164: `+1${digits}` };
    }
    if (digits.length === 11 && digits.startsWith("1")) {
        return { ok: true, e164: `+${digits}` };
    }

    return { ok: false, message: "Use 10 digits or start with +" };
}
