import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { LoginForm } from "@/components/login/login-form";

export default function LoginPage() {
  return (
    <AuthSplitShell>
      <LoginForm />
    </AuthSplitShell>
  );
}
