"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import JSZip from "jszip";
import { AD_CAMPAIGN_RESULT_KEY } from "@/lib/ad-campaign/constants";
import {
  formatHashtagDisplay,
  slideSrc,
  type AdDesign,
  type AdGeneratedImage,
  type AdGenerateResponse,
} from "@/lib/ad-campaign/types";
import { cn } from "@/lib/utils";

const NUM_VARIANTS = 3;

function slugForZipFilename(style: string | undefined, variantIndex: number): string {
  const raw = (style ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || `variant-${variantIndex + 1}`;
}

async function appendImageFile(folder: JSZip, img: AdGeneratedImage, filename: string) {
  if (img.data) {
    const raw = img.data.trim().replace(/^data:image\/\w+;base64,/i, "");
    const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    folder.file(filename, bin);
    return;
  }
  if (img.url) {
    const res = await fetch("/api/ad-campaign/fetch-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: img.url }),
    });
    if (!res.ok) {
      let msg = `Could not download ${filename}`;
      try {
        const j = (await res.json()) as { message?: string };
        if (j.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    folder.file(filename, await res.blob());
    return;
  }
}

function VariantPreviewCard({ design, label }: { design: AdDesign | null; label: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const [index, setIndex] = useState(0);
  const slides = design?.images?.length ? design.images : [];
  const urls = slides.map((s) => slideSrc(s)).filter(Boolean) as string[];
  const hashtags = (design?.hashtags ?? [])
    .map((h) => formatHashtagDisplay(String(h)))
    .filter(Boolean);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [urls.length]);

  const scrollTo = useCallback(
    (i: number) => {
      const el = scrollRef.current;
      if (!el || !urls.length) return;
      const clamped = Math.max(0, Math.min(urls.length - 1, i));
      const w = el.clientWidth || viewportW;
      if (!w) return;
      el.scrollTo({ left: clamped * w, behavior: "smooth" });
      setIndex(clamped);
    },
    [urls.length, viewportW],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !urls.length) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setIndex(Math.max(0, Math.min(urls.length - 1, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [urls.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollTo(index - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollTo(index + 1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [index, scrollTo]);

  const captionText =
    typeof design?.caption === "string" ? design.caption.trim() : "";

  const variantTitle = design?.style?.trim() ? design.style : label;

  return (
    <article className="mx-auto flex w-full max-w-[320px] shrink-0 flex-col">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border-2 border-brand bg-white shadow-[0_12px_40px_-16px_rgba(255,117,31,0.35)]",
        )}
      >
        <div className="shrink-0 border-b border-brand/25 bg-white px-2 py-2 text-center">
          <p className="text-xs font-bold leading-tight tracking-tight text-dark sm:text-sm">
            {variantTitle}
          </p>
        </div>

        <div className="relative aspect-square w-full border-y-2 border-brand bg-white">
          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={design?.style || label}
            className="relative size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
          >
            {urls.length ? (
              <div
                className="flex h-full min-h-0 flex-row"
                style={{ width: viewportW ? viewportW * urls.length : undefined }}
              >
                {urls.map((src, i) => (
                  <div
                    key={i}
                    className="relative h-full min-h-0 shrink-0 snap-center snap-always"
                    style={{ width: viewportW || "100%" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${label} slide ${i + 1} of ${urls.length}`}
                      className="absolute inset-0 size-full object-contain object-center"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative flex size-full items-center justify-center bg-white">
                <Image
                  src="/instaPicturePlaceholder.svg"
                  alt=""
                  width={120}
                  height={120}
                  className="object-contain opacity-35"
                  unoptimized
                />
              </div>
            )}
          </div>
          {urls.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => scrollTo(index - 1)}
                className="absolute bottom-2 left-2 z-20 flex size-8 items-center justify-center rounded-full bg-black/65 text-white shadow-md ring-1 ring-white/20 backdrop-blur-[2px] hover:bg-black/80 sm:size-9"
              >
                <ChevronLeft className="size-4 sm:size-5" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => scrollTo(index + 1)}
                className="absolute bottom-2 right-2 z-20 flex size-8 items-center justify-center rounded-full bg-black/65 text-white shadow-md ring-1 ring-white/20 backdrop-blur-[2px] hover:bg-black/80 sm:size-9"
              >
                <ChevronRight className="size-4 sm:size-5" />
              </button>
            </>
          ) : null}
          {urls.length > 1 ? (
            <p className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium text-white/80 backdrop-blur-[2px]">
              {index + 1} / {urls.length}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-brand/25 bg-white px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-dark">Caption</p>
          {captionText ? (
            <p className="mt-1 text-[11px] leading-snug text-dark sm:text-xs whitespace-pre-wrap">
              {captionText}
            </p>
          ) : (
            <p className="mt-1 text-[11px] italic text-gray-dark sm:text-xs">No caption for this variant.</p>
          )}
        </div>
        <div className="shrink-0 border-t border-brand/25 bg-white px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-dark">Hashtags</p>
          {hashtags.length ? (
            <p className="mt-1 break-words text-[11px] leading-snug text-brand sm:text-xs">
              {hashtags.join(" ")}
            </p>
          ) : (
            <p className="mt-1 text-[11px] italic text-gray-dark sm:text-xs">No hashtags for this variant.</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function ExploreYourOptionsView() {
  const router = useRouter();
  const [designs, setDesigns] = useState<AdDesign[] | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(AD_CAMPAIGN_RESULT_KEY);
    if (!raw) {
      router.replace("/dashboard/ad-campaign-studio");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as AdGenerateResponse;
      if (!parsed.designs?.length) {
        router.replace("/dashboard/ad-campaign-studio");
        return;
      }
      startTransition(() => {
        setDesigns(parsed.designs);
      });
    } catch {
      router.replace("/dashboard/ad-campaign-studio");
    }
  }, [router]);

  const downloadZip = async (scope: "all" | number) => {
    if (!designs?.length) return;
    setZipBusy(true);
    try {
      const zip = new JSZip();
      if (scope === "all") {
        const folder = zip.folder("crave-instagram-carousel");
        if (!folder) return;
        for (let di = 0; di < designs.length; di++) {
          const d = designs[di]!;
          for (let si = 0; si < (d.images?.length ?? 0); si++) {
            const img = d.images[si];
            const name = `variant-${di + 1}-slide-${si + 1}.png`;
            await appendImageFile(folder, img, name);
          }
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "crave-instagram-carousel.zip";
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }

      const d = designs[scope];
      if (!d?.images?.length) return;
      const slug = slugForZipFilename(d.style, scope);
      const folder = zip.folder(`crave-${slug}`);
      if (!folder) return;
      for (let si = 0; si < d.images.length; si++) {
        await appendImageFile(folder, d.images[si]!, `slide-${si + 1}.png`);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `crave-${slug}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not build zip (check image URLs / CORS).");
    } finally {
      setZipBusy(false);
    }
  };

  if (!designs) {
    return (
      <main className="flex min-h-[calc(100svh-4rem)] flex-1 items-center justify-center bg-light font-sans">
        <Loader2 className="size-10 animate-spin text-brand" aria-label="Loading" />
      </main>
    );
  }

  const columns: (AdDesign | null)[] = [];
  for (let i = 0; i < NUM_VARIANTS; i++) {
    columns.push(designs[i] ?? null);
  }

  return (
    <main className="min-w-0 bg-light font-sans">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
        <header className="shrink-0 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">
                Explore your options.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-dark sm:text-base">
                Each column is one AI variant. Swipe the image area to move through that variant&apos;s
                slides. Caption and hashtags sit below the image in the frame—ready to paste into
                Instagram.
              </p>
              <Link
                href="/dashboard/ad-campaign-studio"
                className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
              >
                ← Back to studio
              </Link>
            </div>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger
                type="button"
                disabled={zipBusy}
                aria-haspopup="menu"
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white outline-none transition-colors hover:bg-brand/95 disabled:opacity-60 sm:self-auto sm:px-5 sm:text-base",
                  "data-[state=open]:bg-brand/90",
                )}
              >
                {zipBusy ? (
                  <>
                    <Loader2 className="size-5 shrink-0 animate-spin text-white" aria-hidden />
                    Zipping…
                  </>
                ) : (
                  <>
                    Download ZIP
                    <ChevronDown className="size-4 shrink-0 text-white opacity-90 sm:size-[1.1rem]" aria-hidden />
                  </>
                )}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={8}
                  align="end"
                  className={cn(
                    "z-50 min-w-[13rem] rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none",
                    "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                  )}
                >
                  <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Choose images
                  </DropdownMenu.Label>
                  <DropdownMenu.Item
                    disabled={zipBusy}
                    className="cursor-pointer rounded-md px-2 py-2 outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    onSelect={() => void downloadZip("all")}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ArrowDownCircle className="size-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                      All variants (full ZIP)
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Every slide from every column
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  {columns.map((col, i) =>
                    col ? (
                      <DropdownMenu.Item
                        key={`zip-variant-${i}`}
                        disabled={zipBusy}
                        className="cursor-pointer rounded-md px-2 py-2 outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                        onSelect={() => void downloadZip(i)}
                      >
                        <span className="font-medium">
                          {col.style?.trim() || `Variant ${i + 1}`}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {col.images?.length ?? 0} slide
                          {(col.images?.length ?? 0) === 1 ? "" : "s"} only
                        </span>
                      </DropdownMenu.Item>
                    ) : null,
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <section className="overflow-x-hidden pt-2 pb-10">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
            {columns.map((d, i) => (
              <VariantPreviewCard key={i} design={d} label={`Variant ${i + 1}`} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
