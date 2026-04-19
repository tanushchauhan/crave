"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CraveInChatView } from "@/components/crave-assistant/crave-in-chat-view";
import { CravePreChatView } from "@/components/crave-assistant/crave-prechat-view";

export function AskCraveExperience() {
  const [inChat, setInChat] = useState(false);
  const [firstMessage, setFirstMessage] = useState("");
  const [revealChat, setRevealChat] = useState(false);

  useEffect(() => {
    if (!inChat) {
      setRevealChat(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealChat(true));
    });
    return () => cancelAnimationFrame(id);
  }, [inChat]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-white">
      <div
        className={cn(
          "absolute inset-0 z-10 overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none",
          inChat ? "pointer-events-none opacity-0" : "opacity-100"
        )}
      >
        <CravePreChatView
          onStartChat={(message) => {
            setFirstMessage(message);
            setInChat(true);
          }}
        />
      </div>

      {inChat && (
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col overflow-hidden bg-white transition-opacity duration-300 ease-out motion-reduce:transition-none",
            revealChat ? "opacity-100" : "opacity-0"
          )}
        >
          <CraveInChatView initialUserMessage={firstMessage} />
        </div>
      )}
    </div>
  );
}
