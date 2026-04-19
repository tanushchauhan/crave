"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  return (
    <div className="w-full max-w-[400px] space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-dark">Sign Up</h1>
        <p className="text-md leading-relaxed text-gray-dark">
          Sign up to see who&apos;s booking, what they&apos;re saying, and how to
          win your neighborhood.
        </p>
      </div>

      <form className="space-y-6" noValidate>
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
            className="h-11 rounded-md border-brand bg-white px-3 text-base text-dark shadow-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-base"
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-md bg-brand text-base font-bold text-white shadow-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Login
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
