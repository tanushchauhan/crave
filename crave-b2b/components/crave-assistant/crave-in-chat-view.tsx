"use client";

import { useEffect, useState } from "react";
import { CircleUser, Menu, PanelLeftClose, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChatSearchBar } from "@/components/crave-assistant/chat-search-bar";
import { cn } from "@/lib/utils";

const SIDEBAR_W = 280;

const assistantCopy = (
  <div className="space-y-4 text-[0.95rem] leading-relaxed text-dark sm:text-base">
    <p className="font-bold">Global UI &amp; Layout Attributes</p>
    <p>
      This chat surface uses a fixed header, a collapsible brand sidebar for
      conversation history, and a scrollable transcript with a pinned composer
      at the bottom of the viewport.
    </p>
    <p className="font-bold">1. Top Header (Fixed)</p>
    <ul className="list-disc space-y-2 pl-5">
      <li>
        Full-width <span className="font-semibold">brand</span> bar with the
        Crave wordmark and account affordance.
      </li>
      <li>
        Height aligns with the global navbar; content below starts on a white
        canvas.
      </li>
    </ul>
    <p className="font-bold">2. Sidebar (Collapsible)</p>
    <ul className="list-disc space-y-2 pl-5">
      <li>
        Expanded width uses solid brand background with a high-contrast &quot;New
        Chat&quot; pill and in-sidebar search.
      </li>
      <li>
        Width animates with <span className="font-semibold">ease-in-out</span>{" "}
        timing for smooth open and close.
      </li>
    </ul>
    <p className="font-bold">3. Composer (Pinned)</p>
    <ul className="list-disc space-y-2 pl-5">
      <li>
        Pill-shaped field with orange border, soft shadow, mic and add actions.
      </li>
    </ul>
  </div>
);

const convoItems = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  label: "Convo about food",
  active: i === 0,
}));

type CraveInChatViewProps = {
  initialUserMessage: string;
};

export function CraveInChatView({ initialUserMessage }: CraveInChatViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composerEntered, setComposerEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setComposerEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white font-sans">
      <aside
        id="crave-chat-sidebar"
        className={cn(
          "flex shrink-0 flex-col overflow-hidden bg-brand transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
          sidebarOpen ? "shadow-md" : "shadow-none"
        )}
        style={{ width: sidebarOpen ? SIDEBAR_W : 0 }}
        aria-hidden={!sidebarOpen}
      >
        <div
          className="flex h-full flex-col gap-4 px-3 py-4"
          style={{ width: SIDEBAR_W }}
        >
          <button
            type="button"
            className="w-full rounded-full bg-white/25 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/35"
          >
            + New Chat
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-black/15 px-3 py-2.5 text-white ring-1 ring-white/10">
            <Search className="size-4 shrink-0 text-white" strokeWidth={2} />
            <Input
              type="search"
              placeholder="Search"
              className="h-7 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-white shadow-none placeholder:text-white/75 focus-visible:ring-0"
              aria-label="Search conversations"
            />
          </div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
            {convoItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left text-sm text-white transition-colors",
                  item.active ? "bg-white/20 font-medium" : "hover:bg-white/10"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-start px-4 pt-3 pb-2 sm:px-5">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-2 text-dark transition-colors hover:bg-light"
            aria-expanded={sidebarOpen}
            aria-controls="crave-chat-sidebar"
            id="crave-sidebar-toggle"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-6" strokeWidth={2} />
            ) : (
              <Menu className="size-6" strokeWidth={2} />
            )}
            <span className="sr-only">
              {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 lg:max-w-4xl">
            <div className="flex flex-row-reverse items-end gap-2 pt-1">
              <CircleUser
                className="size-9 shrink-0 text-dark"
                strokeWidth={1.75}
                aria-hidden
              />
              <div
                className="max-w-[min(100%,28rem)] rounded-2xl bg-light px-4 py-3 text-sm text-dark sm:text-base"
                role="status"
              >
                {initialUserMessage}
              </div>
            </div>
            <div className="text-dark">{assistantCopy}</div>
          </div>
        </div>

        <footer
          className={cn(
            "shrink-0 border-t border-light bg-white px-4 py-3 transition-all duration-500 ease-out motion-reduce:transition-none sm:px-6 sm:py-4",
            composerEntered
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
          )}
        >
          <div className="mx-auto max-w-3xl lg:max-w-4xl">
            <ChatSearchBar id="crave-inchat-composer" />
          </div>
        </footer>
      </div>
    </div>
  );
}
