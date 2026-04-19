"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const dashboardNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Menu", href: "/dashboard/menu" },
  { label: "Ad Studio", href: "/dashboard/ad-campaign-studio" },
  { label: "Ask Crave", href: "/dashboard/ask" },
] as const;

const navItemDelays = [
  "motion-safe:delay-0",
  "motion-safe:delay-75",
  "motion-safe:delay-150",
  "motion-safe:delay-200",
] as const;

function isActiveNav(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavbar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const showAccountActions = pathname.startsWith("/dashboard");

  async function onSignOut() {
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="grid h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-brand px-4 sm:gap-6 sm:px-8 md:px-12 lg:px-16">
      <Link
        href="/"
        prefetch={false}
        className={cn(
          "relative h-10 w-28 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none sm:h-11 sm:w-32",
          "hover:scale-[1.04] active:scale-[0.98]",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-500 motion-safe:ease-out",
        )}
        aria-label="crave home"
      >
        <Image
          src="/craveLogo.svg"
          alt=""
          fill
          sizes="128px"
          className="object-contain object-left"
          style={{ filter: "brightness(0) invert(1)" }}
          priority
          unoptimized
        />
      </Link>

      <nav
        className="flex min-w-0 items-center justify-center gap-1 overflow-x-auto sm:gap-5 md:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main"
      >
        {dashboardNav.map(({ label, href }, index) => {
          const active = isActiveNav(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 rounded-md px-1.5 py-2 text-xs font-medium tracking-wide sm:px-2 sm:text-sm",
                "text-white/85 transition-colors duration-200 ease-out motion-reduce:transition-none",
                "hover:text-white",
                "after:pointer-events-none after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:origin-center after:rounded-full after:bg-white after:transition-transform after:duration-300 after:ease-out motion-reduce:after:transition-none",
                active ? "text-white after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-top-1 motion-safe:duration-400 motion-safe:ease-out motion-safe:fill-mode-both",
                navItemDelays[index],
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex shrink-0 items-center justify-end",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-500 motion-safe:ease-out",
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (showAccountActions) void onSignOut();
          }}
          disabled={signingOut}
          className={cn(
            "rounded-full p-1 text-white",
            "transition-[transform,opacity,box-shadow] duration-200 ease-out motion-reduce:transition-none",
            showAccountActions &&
              "hover:scale-110 hover:opacity-95 hover:shadow-[0_0_0_2px_rgba(255,255,255,0.35)] active:scale-95 active:opacity-100",
            !showAccountActions && "opacity-60",
          )}
          aria-label={showAccountActions ? "Sign out" : "Account"}
          title={showAccountActions ? "Sign out" : undefined}
        >
          <CircleUser className="size-8 stroke-[1.35]" strokeWidth={1.35} />
        </button>
      </div>
    </header>
  );
}
