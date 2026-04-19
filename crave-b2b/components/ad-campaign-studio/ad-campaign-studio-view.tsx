"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AD_CAMPAIGN_RESULT_KEY,
  AD_MAX_INPUT_BYTES,
  AD_MAX_INPUT_IMAGES,
} from "@/lib/ad-campaign/constants";
import type { AdGenerateResponse } from "@/lib/ad-campaign/types";

type UploadItem = { id: string; dataUrl: string };

function approxBytesFromBase64DataUrl(dataUrl: string): number {
  const base = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
  return Math.floor((base.replace(/\s/g, "").length * 3) / 4);
}

function totalBytes(items: UploadItem[]): number {
  return items.reduce((s, it) => s + approxBytesFromBase64DataUrl(it.dataUrl), 0);
}

export function AdCampaignStudioView() {
  const router = useRouter();
  const inputId = useId();
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef(items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const onFiles = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError(null);
    const remainingSlots = AD_MAX_INPUT_IMAGES - itemsRef.current.length;
    if (remainingSlots <= 0) {
      setError(`You can upload at most ${AD_MAX_INPUT_IMAGES} images.`);
      return;
    }
    const toRead = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remainingSlots);

    const work = toRead.map(
      (file) =>
        new Promise<UploadItem | null>((resolve) => {
          const r = new FileReader();
          r.onload = () => {
            const dataUrl = typeof r.result === "string" ? r.result : null;
            if (!dataUrl) {
              resolve(null);
              return;
            }
            resolve({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, dataUrl });
          };
          r.onerror = () => resolve(null);
          r.readAsDataURL(file);
        }),
    );

    void Promise.all(work).then((rows) => {
      const candidates = rows.filter(Boolean) as UploadItem[];
      const prev = itemsRef.current;
      const merged = [...prev];
      let total = totalBytes(merged);
      let skippedForSize = false;
      for (const item of candidates) {
        if (merged.length >= AD_MAX_INPUT_IMAGES) break;
        const add = approxBytesFromBase64DataUrl(item.dataUrl);
        if (total + add > AD_MAX_INPUT_BYTES) {
          skippedForSize = true;
          continue;
        }
        merged.push(item);
        total += add;
      }
      itemsRef.current = merged;
      setItems(merged);

      if (toRead.length && !candidates.length) {
        setError("Could not read those images. Try a different format.");
      } else if (skippedForSize) {
        setError(
          `Some files were skipped so total size stays under ${Math.round(AD_MAX_INPUT_BYTES / (1024 * 1024))} MB.`,
        );
      }
    });
  }, []);

  const remove = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setError(null);
  };

  const generate = async () => {
    const p = prompt.trim();
    if (!p) {
      setError("Enter a prompt before generating.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ad-campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          images: items.map((i) => i.dataUrl),
        }),
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        setError("Unexpected response from the server.");
        return;
      }
      if (!res.ok) {
        const msg =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as { message?: unknown }).message)
            : typeof data === "object" && data !== null && "error" in data
              ? String((data as { error?: unknown }).error)
              : text.slice(0, 200);
        setError(msg || `Request failed (${res.status})`);
        return;
      }
      const parsed = data as AdGenerateResponse;
      if (!parsed.designs || !Array.isArray(parsed.designs)) {
        setError("Invalid generate response: missing designs.");
        return;
      }
      const payload = JSON.stringify({ designs: parsed.designs, meta: parsed.meta ?? null });
      try {
        sessionStorage.setItem(AD_CAMPAIGN_RESULT_KEY, payload);
      } catch {
        setError(
          "Result is too large for browser storage. Enable S3 on the ad Lambda (presigned URLs) or remove some reference images.",
        );
        return;
      }
      router.push("/dashboard/ad-campaign-studio/explore");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const slots = AD_MAX_INPUT_IMAGES;
  const filled = items.length;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-light font-sans">
      <div className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">
          Ad Campaign Studio
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-dark sm:text-lg">
          Describe your campaign goals, tone, and target audience in the prompt
          box. Upload reference images to guide the visual style of your
          carousel. When you are ready, generate a cohesive multi-slide Instagram
          carousel tailored to your restaurant brand.
        </p>

        {error ? (
          <p
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-8 lg:mt-12 lg:grid-cols-2 lg:gap-10">
          <section className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-dark">Prompt Box</h2>
            <Textarea
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter here..."
              disabled={busy}
              className="mt-3 min-h-[min(22rem,50vh)] w-full resize-y rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm"
            />
          </section>

          <section className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-dark">Image Uploads</h2>
            <p className="mt-1 text-xs text-gray-dark">
              Up to {AD_MAX_INPUT_IMAGES} images, {Math.round(AD_MAX_INPUT_BYTES / (1024 * 1024))} MB total.
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: slots }, (_, index) => {
                if (index === 0) {
                  return (
                    <label
                      key="upload"
                      htmlFor={inputId}
                      className="group relative aspect-[3/4] w-full min-h-0 cursor-pointer overflow-hidden rounded-lg"
                    >
                      <input
                        id={inputId}
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={busy || filled >= AD_MAX_INPUT_IMAGES}
                        className="sr-only"
                        onChange={(e) => {
                          onFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <span className="flex size-full items-center justify-center bg-brand transition-opacity group-hover:opacity-95 group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-brand disabled:opacity-50">
                        <Plus
                          className="size-8 text-white sm:size-10"
                          strokeWidth={3}
                          aria-hidden
                        />
                        <span className="sr-only">Upload images</span>
                      </span>
                    </label>
                  );
                }
                const item = items[index - 1];
                if (!item) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="relative aspect-[3/4] w-full min-h-0 overflow-hidden rounded-lg bg-white ring-1 ring-brand/15"
                    >
                      <Image
                        src="/instaPicturePlaceholder.svg"
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 25vw, 180px"
                        className="object-cover object-center opacity-40"
                        unoptimized
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={item.id}
                    className="relative aspect-[3/4] w-full min-h-0 overflow-hidden rounded-lg bg-white ring-1 ring-brand/25"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.dataUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover object-center"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(item.id)}
                      className="absolute right-1 top-1 z-10 flex size-8 items-center justify-center rounded-full bg-dark/70 text-white transition hover:bg-dark disabled:opacity-50"
                      aria-label="Remove image"
                    >
                      <X className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-10 lg:mt-12">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-4 text-center text-base font-bold text-white transition-colors hover:bg-brand/95 disabled:opacity-60 sm:text-lg"
          >
            {busy ? (
              <>
                <Loader2 className="size-6 shrink-0 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              "Generate Instagram Carousel"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
