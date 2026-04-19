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
import {
  formatHashtagDisplay,
  slideSrc,
  type AdDesign,
  type AdGenerateResponse,
} from "@/lib/ad-campaign/types";

const NUM_VARIANTS = 3;

function IphoneCarousel({ design, label }: { design: AdDesign | null; label: string }) {
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

  return (
    <article className="flex w-full max-w-[min(100%,380px)] shrink-0 flex-col items-stretch gap-4">
      <h2 className="text-center text-base font-bold tracking-tight text-dark sm:text-lg">
        {design?.style ? design.style : label}
      </h2>

      {/* Phone shell: square viewport centered for 1024×1024 feed-style tiles */}
      <div className="relative mx-auto aspect-[141.75/283.5] w-full max-w-[min(100%,320px)] shrink-0">
        <div className="absolute inset-[11%_7%_20%_7%] z-0 flex items-center justify-center sm:inset-[11%_7%_19%_7%]">
          <div className="flex size-full max-h-full max-w-full items-center justify-center">
            <div className="aspect-square h-full max-h-full w-full max-w-full min-h-0 min-w-0 overflow-hidden rounded-[1.1rem] bg-neutral-950 shadow-inner sm:rounded-[1.2rem]">
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
                          className="absolute inset-0 size-full object-contain object-center"
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
                      sizes="320px"
                      className="object-contain object-center opacity-50"
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
                    className="absolute bottom-[8%] left-[6%] z-20 flex size-9 items-center justify-center rounded-full bg-dark/70 text-white shadow-md ring-1 ring-white/15 hover:bg-dark"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => scrollTo(index + 1)}
                    className="absolute bottom-[8%] right-[6%] z-20 flex size-9 items-center justify-center rounded-full bg-dark/70 text-white shadow-md ring-1 ring-white/15 hover:bg-dark"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10">
          <Image
            src="/iphoneFrame.svg"
            alt=""
            fill
            sizes="(max-width: 768px) 90vw, 320px"
            className="object-contain object-center"
            unoptimized
          />
        </div>
      </div>

      {urls.length > 1 ? (
        <p className="text-center text-xs font-medium text-gray-dark">
          Slide {index + 1} of {urls.length} · swipe or tap arrows
        </p>
      ) : null}

      <div className="flex min-h-0 w-full flex-col gap-3 rounded-xl border border-brand/25 bg-white p-4 text-dark shadow-sm ring-1 ring-black/5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-dark">Caption</h3>
          {captionText ? (
            <p className="mt-1.5 max-h-48 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
              {captionText}
            </p>
          ) : (
            <p className="mt-1.5 text-sm italic text-gray-dark">No caption returned for this variant.</p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-dark">Hashtags</h3>
          {hashtags.length ? (
            <p className="mt-1.5 text-sm leading-relaxed text-brand">
              {hashtags.join(" ")}
            </p>
          ) : (
            <p className="mt-1.5 text-sm italic text-gray-dark">No hashtags returned for this variant.</p>
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
    <main className="flex h-full min-h-0 min-w-0 flex-col bg-light font-sans">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="shrink-0 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">
                Explore your options.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-dark sm:text-base">
                Each column is one AI variant. Swipe inside the phone to move through that variant&apos;s
                carousel. Captions and hashtags are ready to paste into Instagram.
              </p>
              <Link
                href="/dashboard/ad-campaign-studio"
                className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
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
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-8 pt-2">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
            {columns.map((d, i) => (
              <IphoneCarousel key={i} design={d} label={`Variant ${i + 1}`} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
