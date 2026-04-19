"use client";

import { usePathname } from "next/navigation";
import { SiteNavbar } from "@/components/layout/site-navbar";

const HIDE_NAVBAR_PREFIXES = ["/login", "/signup"];

export function ConditionalSiteNavbar() {
  const pathname = usePathname();
  if (
    HIDE_NAVBAR_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }
  return <SiteNavbar />;
}
