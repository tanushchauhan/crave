import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}/login?error=server_misconfigured`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // ignore
        }
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pending = user?.user_metadata?.pending_restaurant_name;
  if (typeof pending === "string" && pending.trim().length > 0) {
    const { error: rpcError } = await supabase.rpc("register_restaurant_on_signup", {
      p_restaurant_name: pending.trim(),
    });
    if (rpcError) {
      return NextResponse.redirect(
        `${origin}/signup?error=${encodeURIComponent(rpcError.message)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
