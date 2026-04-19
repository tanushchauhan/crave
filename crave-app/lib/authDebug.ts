import type { Session } from "@supabase/supabase-js";

/** Logs session fields to Metro console; only runs in `__DEV__`. Remove for production hardening. */
export function logAuthSession(context: string, session: Session | null): void {
    if (!__DEV__) {
        return;
    }
    if (!session) {
        console.log(`[auth] ${context}: (no session)`);
        return;
    }
    const { user } = session;
    console.log(`[auth] ${context}`, {
        userId: user.id,
        phone: user.phone,
        email: user.email,
        expires_at: session.expires_at,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    });
}
