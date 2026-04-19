import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { SignupForm } from "@/components/signup/signup-form";

export default function SignupPage() {
  return (
    <AuthSplitShell>
      <SignupForm />
    </AuthSplitShell>
  );
}
