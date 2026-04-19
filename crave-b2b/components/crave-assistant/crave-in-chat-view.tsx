"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, CircleUser, Menu, PanelLeftClose, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChatSearchBar } from "@/components/crave-assistant/chat-search-bar";
import { cn } from "@/lib/utils";

const SIDEBAR_W = 280;

const convoItems = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  label: "Convo about food",
  active: i === 0,
}));

type ChatTurn = { role: "user" | "assistant"; content: string };

type CraveInChatViewProps = {
  initialUserMessage: string;
};

export function CraveInChatView({ initialUserMessage }: CraveInChatViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [composerEntered, setComposerEntered] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>(() =>
    initialUserMessage.trim()
      ? [{ role: "user", content: initialUserMessage.trim() }]
      : [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setComposerEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, error]);

  async function runCompletion(thread: ChatTurn[], signal?: AbortSignal) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/b2b-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: thread }),
        signal,
      });
      const text = await res.text();
      if (signal?.aborted) return;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text.slice(0, 280) || "Invalid JSON from assistant");
      }
      if (!res.ok) {
        const err =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : res.statusText;
        throw new Error(err);
      }
      const choice = (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0];
      const reply = choice?.message?.content?.trim() || "(No text in reply.)";
      setMessages([...thread, { role: "assistant", content: reply }]);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const msg = initialUserMessage.trim();
    if (!msg) return;
    const ac = new AbortController();
    const thread: ChatTurn[] = [{ role: "user", content: msg }];
    void runCompletion(thread, ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap first turn only from route props
  }, []);

  async function handleComposerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "").trim();
    if (!q) return;
    const thread = [...messages, { role: "user" as const, content: q }];
    setMessages(thread);
    e.currentTarget.reset();
    await runCompletion(thread);
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-white font-sans">
      <aside
        id="crave-chat-sidebar"
        className={cn(
          "flex shrink-0 flex-col overflow-hidden bg-brand transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
          sidebarOpen ? "shadow-md" : "shadow-none",
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
                  item.active ? "bg-white/20 font-medium" : "hover:bg-white/10",
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
          <div className="mx-auto flex max-w-3xl flex-col gap-5 lg:max-w-4xl">
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn(
                  "flex gap-2 pt-0.5",
                  m.role === "user" ? "flex-row-reverse items-end" : "flex-row items-start",
                )}
              >
                {m.role === "user" ? (
                  <CircleUser className="size-9 shrink-0 text-dark" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Bot className="size-9 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
                )}
                <div
                  className={cn(
                    "max-w-[min(100%,28rem)] rounded-2xl px-4 py-3 text-sm sm:text-base",
                    m.role === "user"
                      ? "bg-light text-dark"
                      : "border border-light bg-white text-dark shadow-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <Bot className="size-9 shrink-0 text-brand/60" strokeWidth={1.75} aria-hidden />
                <span className="pt-2">Thinking…</span>
              </div>
            )}
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <footer
          className={cn(
            "shrink-0 border-t border-light bg-white px-4 py-3 transition-all duration-500 ease-out motion-reduce:transition-none sm:px-6 sm:py-4",
            composerEntered
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
          )}
        >
          <div className="mx-auto max-w-3xl lg:max-w-4xl">
            <form
              onSubmit={handleComposerSubmit}
              className={cn(pending && "pointer-events-none opacity-60")}
            >
              <ChatSearchBar name="q" id="crave-inchat-composer" disabled={pending} />
              <button type="submit" className="sr-only">
                Send
              </button>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
}
