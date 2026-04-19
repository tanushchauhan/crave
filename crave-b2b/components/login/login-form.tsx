"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const urlError = searchParams.get("error");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[400px] space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-dark">Login</h1>
        <p className="text-md leading-relaxed text-gray-dark">
          Access your restaurant&apos;s pulse with real-time analytics and
          AI-powered creative tools.
        </p>
      </div>

      {(urlError || error) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error ?? decodeURIComponent(urlError ?? "")}
        </p>
      )}

      <form className="space-y-6" noValidate onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-bold text-dark">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="email@example.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            className="h-11 rounded-lg border-brand bg-white px-3 text-base text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="password" className="text-base font-bold text-dark">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-dark underline-offset-2 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            className="h-11 rounded-lg border-brand bg-white px-3 text-base text-dark shadow-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg bg-brand text-base font-bold text-white shadow-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Login"}
        </Button>
      </form>

      <p className="text-center text-sm text-dark">
        New User?{" "}
        <Link
          href="/signup"
          className="font-bold underline underline-offset-2"
        >
          Create account here
        </Link>
      </p>
    </div>
  );
}
