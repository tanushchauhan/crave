import type { ReactNode } from "react";

export default function ExploreYourOptionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-0 w-full flex-col overflow-hidden overscroll-none">
      {children}
    </div>
  );
}
