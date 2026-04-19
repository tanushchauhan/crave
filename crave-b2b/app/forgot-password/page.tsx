import { Suspense } from "react";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { ForgotPasswordForm } from "@/components/login/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthSplitShell>
      <Suspense fallback={<p className="text-dark">Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthSplitShell>
  );
}
