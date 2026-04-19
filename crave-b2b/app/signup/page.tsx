import { Suspense } from "react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { SignupForm } from "@/components/signup/signup-form";

export default function SignupPage() {
  return (
    <AuthSplitShell>
      <Suspense fallback={<p className="text-dark">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </AuthSplitShell>
  );
}
