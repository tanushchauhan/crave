"use client";

import { useRef, useState } from "react";
import { FileText, Mic, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filesToUserParts,
  type UserContentPart,
} from "@/lib/b2b-chat/multipart-messages";

const MAX_FILES = 6;

type PendingFile = { id: string; file: File; preview?: string };

function revokePreview(p: PendingFile) {
  if (p.preview) URL.revokeObjectURL(p.preview);
}

export type ChatSearchBarProps = {
  id?: string;
  disabled?: boolean;
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  /** Called on Enter / implicit submit. Text may be empty if only attachments. */
  onSend: (text: string, fileParts: UserContentPart[]) => void | Promise<void>;
};

export function ChatSearchBar({
  id = "crave-chat-search",
  disabled,
  defaultValue,
  autoFocus,
  className,
  onSend,
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    if (disabled) return;
    const text = (inputRef.current?.value ?? "").trim();
    if (!text && pending.length === 0) return;
    let fileParts: UserContentPart[] = [];
    try {
      fileParts =
        pending.length > 0 ? await filesToUserParts(pending.map((p) => p.file)) : [];
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not read files.");
      return;
    }
    await onSend(text, fileParts);
    if (inputRef.current) inputRef.current.value = "";
    pending.forEach(revokePreview);
    setPending([]);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalError(null);
    const list = e.target.files;
    if (!list?.length) return;
    setPending((prev) => {
      const next = [...prev];
      for (let i = 0; i < list.length; i++) {
        if (next.length >= MAX_FILES) break;
        const file = list[i]!;
        next.push({
          id: `${Date.now()}-${i}-${file.name}`,
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        });
      }
      return next;
    });
    e.target.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) revokePreview(p);
      return prev.filter((x) => x.id !== id);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex min-w-0 max-w-full flex-col gap-2", className)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={onPickFiles}
      />
      <div
        className={cn(
          "flex w-full min-w-0 max-w-full items-center gap-2 rounded-full border-2 border-brand bg-white px-3 py-2 shadow-[0_8px_28px_-8px_rgba(255,117,31,0.4)] sm:gap-3 sm:px-4 sm:py-2.5 md:gap-4 md:px-5",
          disabled && "pointer-events-none opacity-60",
        )}
        role="search"
      >
        <Search className="size-5 shrink-0 text-brand sm:size-6" strokeWidth={2} />
        <Input
          ref={inputRef}
          id={id}
          name="q"
          type="text"
          enterKeyHint="send"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="Ask Crave anything about your restaurant…"
          className="h-10 min-w-0 w-full flex-1 border-0 bg-transparent px-0 text-base text-dark shadow-none placeholder:text-gray focus-visible:ring-0 md:text-base"
        />
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            disabled={disabled}
            className="rounded-full p-2 text-brand transition-colors hover:bg-brand/10 disabled:opacity-40"
            aria-label="Voice search (coming soon)"
          >
            <Mic className="size-5 sm:size-6" strokeWidth={2} />
          </button>
          <button
            type="button"
            disabled={disabled || pending.length >= MAX_FILES}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full p-2 text-brand transition-colors hover:bg-brand/10 disabled:opacity-40"
            aria-label="Attach images or PDF"
          >
            <Plus className="size-5 sm:size-6" strokeWidth={2} />
          </button>
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="flex flex-wrap gap-2 pl-1">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-light/90 py-1 pr-1 pl-1 text-xs text-dark"
            >
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob preview
                <img
                  src={p.preview}
                  alt=""
                  className="size-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <FileText className="size-7 shrink-0 rounded-full bg-white p-1 text-brand" />
              )}
              <span className="max-w-[10rem] truncate">{p.file.name}</span>
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="rounded-full p-1 text-dark/70 hover:bg-dark/10"
                aria-label={`Remove ${p.file.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {localError ? (
        <p className="text-sm text-red-600" role="alert">
          {localError}
        </p>
      ) : null}
    </form>
  );
}
