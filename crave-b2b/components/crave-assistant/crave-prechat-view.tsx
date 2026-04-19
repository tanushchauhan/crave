"use client";

import { useState } from "react";
import Image from "next/image";
import { ChatSearchBar } from "@/components/crave-assistant/chat-search-bar";
import { cn } from "@/lib/utils";
import type { UserContentPart } from "@/lib/b2b-chat/multipart-messages";

const pastConversations = [
  "some question about the restaurant blah blah blah bl...",
  "some question about the restaurant blah blah blah bl...",
  "some question about the restaurant blah blah blah bl...",
  "some question about the restaurant blah blah blah bl...",
  "some question about the restaurant blah blah blah bl...",
  "some question about the restaurant blah blah blah bl...",
  "some question about the restaurant blah blah blah bl...",
];

type CravePreChatViewProps = {
  onStartChat: (message: string, parts: UserContentPart[]) => void;
};

export function CravePreChatView({ onStartChat }: CravePreChatViewProps) {
  const [exiting, setExiting] = useState(false);

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-white font-sans">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-5 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-5 lg:max-w-4xl">
        <div className="flex shrink-0 flex-col items-center">
          <div
            className={cn(
              "relative h-28 w-56 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:h-36 sm:w-72",
              exiting && "pointer-events-none opacity-0",
            )}
          >
            <Image
              src="/craveLogo.svg"
              alt="Crave"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 640px) 224px, 288px"
              unoptimized
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(52%) sepia(98%) saturate(2400%) hue-rotate(352deg) brightness(103%) contrast(101%)",
              }}
            />
          </div>
          <div
            className={cn(
              "mt-8 w-full max-w-full transition-all duration-500 ease-in-out motion-reduce:transition-none sm:mt-10",
              exiting &&
                "translate-y-[min(52vh,28rem)] scale-[0.97] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100",
            )}
          >
            <ChatSearchBar
              id="crave-prechat-search"
              onSend={async (text, parts) => {
                if (!text.trim() && parts.length === 0) return;
                setExiting(true);
                window.setTimeout(() => onStartChat(text, parts), 460);
              }}
            />
          </div>
        </div>

        <section
          className={cn(
            "mt-8 flex min-h-0 flex-1 flex-col transition-opacity duration-300 ease-out motion-reduce:transition-none sm:mt-10",
            exiting && "opacity-0",
          )}
        >
          <h2 className="mb-3 shrink-0 text-left text-lg font-bold text-dark sm:text-xl">
            Past Conversations
          </h2>
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pb-2">
            {pastConversations.map((text, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full rounded-xl bg-light px-4 py-3.5 text-left text-sm text-dark transition-colors hover:bg-light/80 sm:text-base"
                >
                  <span className="block truncate">{text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
