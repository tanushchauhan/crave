import type { ReactNode } from "react";

export default function ExploreYourOptionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="w-full min-h-0">{children}</div>;
}
