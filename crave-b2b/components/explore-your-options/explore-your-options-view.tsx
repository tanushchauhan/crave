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
import { ArrowDownCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { AD_CAMPAIGN_RESULT_KEY } from "@/lib/ad-campaign/constants";
import { slideSrc, type AdDesign, type AdGenerateResponse } from "@/lib/ad-campaign/types";

const NUM_VARIANTS = 3;

function IphoneCarousel({ design, label }: { design: AdDesign | null; label: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const [index, setIndex] = useState(0);
  const slides = design?.images?.length ? design.images : [];
  const urls = slides.map((s) => slideSrc(s)).filter(Boolean) as string[];

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

  return (
    <div className="flex w-full max-w-[220px] shrink-0 flex-col items-center gap-2 sm:max-w-[240px]">
      <p className="line-clamp-2 min-h-10 text-center text-xs font-bold text-dark sm:text-sm">
        {design?.style ? design.style : label}
      </p>
      <div className="relative aspect-[141.75/283.5] w-full">
        <div className="absolute inset-[11%_7%_8%_7%] z-0 overflow-hidden rounded-[1.65rem] bg-neutral-900 sm:rounded-[1.75rem]">
          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={design?.style || label}
            className="relative size-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
                      className="absolute inset-0 size-full object-cover object-center"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative size-full">
                <Image
                  src="/instaPicturePlaceholder.svg"
                  alt=""
                  fill
                  sizes="240px"
                  className="object-cover object-center opacity-50"
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
                className="absolute bottom-[14%] left-[10%] z-20 flex size-8 items-center justify-center rounded-full bg-dark/55 text-white shadow hover:bg-dark/75"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => scrollTo(index + 1)}
                className="absolute bottom-[14%] right-[10%] z-20 flex size-8 items-center justify-center rounded-full bg-dark/55 text-white shadow hover:bg-dark/75"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10">
          <Image
            src="/iphoneFrame.svg"
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 240px"
            className="object-contain object-center"
            unoptimized
          />
        </div>
      </div>
      {urls.length > 1 ? (
        <p className="text-[11px] text-gray-dark">
          Slide {index + 1} / {urls.length} · swipe or use arrows
        </p>
      ) : null}
      {design?.caption ? (
        <p className="line-clamp-3 w-full text-[11px] leading-snug text-gray-dark">{design.caption}</p>
      ) : null}
    </div>
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

  const downloadZip = async () => {
    if (!designs?.length) return;
    setZipBusy(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("crave-instagram-carousel");
      if (!folder) return;
      for (let di = 0; di < designs.length; di++) {
        const d = designs[di];
        for (let si = 0; si < (d.images?.length ?? 0); si++) {
          const img = d.images[si];
          const name = `variant-${di + 1}-slide-${si + 1}.png`;
          if (img.url) {
            const res = await fetch(img.url);
            if (!res.ok) throw new Error(`Failed to fetch ${name}`);
            folder.file(name, await res.blob());
          } else if (img.data) {
            const raw = img.data.trim().replace(/^data:image\/\w+;base64,/i, "");
            const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
            folder.file(name, bin);
          }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "crave-instagram-carousel.zip";
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
      <main className="flex h-full min-h-0 flex-1 items-center justify-center bg-light font-sans">
        <Loader2 className="size-10 animate-spin text-brand" aria-label="Loading" />
      </main>
    );
  }

  const columns: (AdDesign | null)[] = [];
  for (let i = 0; i < NUM_VARIANTS; i++) {
    columns.push(designs[i] ?? null);
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-light font-sans">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">
              Explore your options.
            </h1>
            <Link
              href="/dashboard/ad-campaign-studio"
              className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
            >
              ← Back to studio
            </Link>
          </div>
          <button
            type="button"
            disabled={zipBusy}
            onClick={() => void downloadZip()}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand/95 disabled:opacity-60 sm:self-auto sm:px-5 sm:text-base"
          >
            {zipBusy ? (
              <>
                <Loader2 className="size-5 shrink-0 animate-spin text-white" aria-hidden />
                Zipping…
              </>
            ) : (
              <>
                Download Zip
                <ArrowDownCircle className="size-5 shrink-0 text-white sm:size-6" strokeWidth={2} aria-hidden />
              </>
            )}
          </button>
        </header>

        <section className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden py-4 sm:py-6">
          <div className="flex min-h-0 w-full max-w-6xl flex-wrap items-start justify-center gap-8 sm:gap-10 lg:gap-14">
            {columns.map((d, i) => (
              <IphoneCarousel
                key={i}
                design={d}
                label={`Variant ${i + 1}`}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
