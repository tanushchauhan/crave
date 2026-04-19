"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${origin}/auth/callback?next=/dashboard` },
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setInfo("If that email is registered, you will receive a reset link shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-[400px] space-y-8",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out motion-safe:fill-mode-both",
      )}
    >
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-dark">Reset password</h1>
        <p className="text-md leading-relaxed text-gray-dark">
          Enter your account email and we will send you a link to sign back in.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-dark">
          {info}
        </p>
      )}

      <form className="space-y-6" noValidate onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-base font-bold text-dark">
            Email
          </Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            className="h-11 rounded-lg border-brand bg-white px-3 text-base text-dark shadow-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg bg-brand text-base font-bold text-white shadow-none hover:bg-brand/90 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-dark">
        <Link href="/login" className="font-bold underline underline-offset-2">
          Back to login
        </Link>
      </p>
    </div>
  );
}
