"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function mapSignupRpcError(message: string): string {
  if (message.includes("restaurant_already_claimed")) {
    return "That restaurant name is already registered to another account.";
  }
  if (message.includes("ambiguous_restaurant_name")) {
    return "Multiple restaurants match that name. Contact support to claim yours.";
  }
  if (message.includes("empty_restaurant_name")) {
    return "Please enter your restaurant name.";
  }
  if (message.includes("not_authenticated")) {
    return "Your session expired. Try signing in again.";
  }
  return message;
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const urlError = searchParams.get("error");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmedName = restaurantName.trim();
    if (!trimmedName) {
      setError("Please enter your restaurant name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            pending_restaurant_name: trimmedName,
          },
        },
      });

      if (signError) {
        setError(signError.message);
        return;
      }

      if (data.session) {
        const { error: rpcError } = await supabase.rpc(
          "register_restaurant_on_signup",
          { p_restaurant_name: trimmedName },
        );
        if (rpcError) {
          setError(mapSignupRpcError(rpcError.message));
          return;
        }
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setInfo(
        "Check your email to confirm your account. After you confirm, you will be signed in and your restaurant will be linked.",
      );
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
        <h1 className="text-4xl font-bold text-dark">Sign Up</h1>
        <p className="text-md leading-relaxed text-gray-dark">
          Sign up to see who&apos;s booking, what they&apos;re saying, and how to
          win your neighborhood.
        </p>
      </div>

      {(urlError || error) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error ??
            mapSignupRpcError(
              (() => {
                try {
                  return decodeURIComponent(urlError ?? "");
                } catch {
                  return urlError ?? "";
                }
              })(),
            )}
        </p>
      )}

      {info && (
        <p className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-dark">
          {info}
        </p>
      )}

      <form className="space-y-6" noValidate onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label
            htmlFor="signup-restaurant-name"
            className="text-sm font-bold text-dark"
          >
            Restaurant name
          </Label>
          <Input
            id="signup-restaurant-name"
            name="restaurantName"
            type="text"
            autoComplete="organization"
            placeholder="Your restaurant's name"
            value={restaurantName}
            onChange={(ev) => setRestaurantName(ev.target.value)}
            required
            className="h-11 rounded-md border-brand bg-white px-3 text-base text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-sm font-bold text-dark">
            Email
          </Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="email@example.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            className="h-11 rounded-md border-brand bg-white px-3 text-base text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="signup-password"
            className="text-sm font-bold text-dark"
          >
            Password
          </Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={6}
            className="h-11 rounded-md border-brand bg-white px-3 text-base text-dark shadow-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-md bg-brand text-base font-bold text-white shadow-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm font-bold text-dark">
        Already a user?{" "}
        <Link href="/login" className="underline underline-offset-2">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
