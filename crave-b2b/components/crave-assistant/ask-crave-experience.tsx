"use client";

import { useLayoutEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CraveInChatView } from "@/components/crave-assistant/crave-in-chat-view";
import { CravePreChatView } from "@/components/crave-assistant/crave-prechat-view";
import {
  ASK_DRAFT_STORAGE_KEY,
  type UserContentPart,
} from "@/lib/b2b-chat/multipart-messages";

type AskCraveExperienceProps = {
  /** When set (e.g. `/dashboard/ask?q=...` from the home dashboard), skip pre-chat and open the thread. */
  initialPrompt?: string;
};

type LocalDraft = { text: string; parts: UserContentPart[] };

export function AskCraveExperience({ initialPrompt = "" }: AskCraveExperienceProps) {
  const fromUrl = initialPrompt.trim();
  const [sessionDraft, setSessionDraft] = useState<LocalDraft | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const [layoutDone, setLayoutDone] = useState(() => Boolean(fromUrl));

  useLayoutEffect(() => {
    if (fromUrl) {
      try {
        const raw = sessionStorage.getItem(ASK_DRAFT_STORAGE_KEY);
        if (raw) sessionStorage.removeItem(ASK_DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem(ASK_DRAFT_STORAGE_KEY);
      if (raw) {
        sessionStorage.removeItem(ASK_DRAFT_STORAGE_KEY);
        const d = JSON.parse(raw) as { text?: string; parts?: UserContentPart[] };
        const parts = Array.isArray(d.parts) ? d.parts : [];
        const text = typeof d.text === "string" ? d.text : "";
        if (parts.length > 0 || text.trim()) {
          setSessionDraft({ text, parts });
        }
      }
    } catch {
      /* ignore */
    }
    setLayoutDone(true);
  }, [fromUrl]);

  const draft = localDraft ?? sessionDraft;
  const firstMessage = fromUrl || (draft?.text ?? "");
  const initialParts = draft?.parts ?? [];
  const openChat =
    Boolean(fromUrl) ||
    Boolean(draft && (draft.parts.length > 0 || draft.text.trim().length > 0));

  const showChatLayer =
    layoutDone && openChat && (firstMessage.trim().length > 0 || initialParts.length > 0);

  const [revealChat, setRevealChat] = useState(false);

  useLayoutEffect(() => {
    if (!showChatLayer) {
      setRevealChat(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealChat(true));
    });
    return () => cancelAnimationFrame(id);
  }, [showChatLayer]);

  const chatKey = `${firstMessage}::${initialParts.map((p) => p.type).join(",")}::${initialParts.length}`;

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-white">
      <div
        className={cn(
          "absolute inset-0 z-10 overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none",
          showChatLayer ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <CravePreChatView
          onStartChat={(message, parts) => {
            setLocalDraft({ text: message, parts });
          }}
        />
      </div>

      {showChatLayer ? (
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col overflow-hidden bg-white transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            revealChat
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-1 motion-reduce:translate-y-0",
          )}
        >
          <CraveInChatView
            key={chatKey}
            initialUserMessage={firstMessage}
            initialUserParts={initialParts}
          />
        </div>
      ) : null}
    </div>
  );
}
