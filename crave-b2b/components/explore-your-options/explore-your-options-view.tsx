import Image from "next/image";
import { ArrowDownCircle } from "lucide-react";

function IphonePreview() {
  return (
    <div className="relative aspect-[141.75/283.5] w-full max-w-[220px] shrink-0 sm:max-w-[240px]">
      <div className="absolute inset-[11%_7%_8%_7%] z-0 overflow-hidden rounded-[1.65rem] bg-white sm:rounded-[1.75rem]">
        <div className="relative size-full">
          <Image
            src="/instaPicturePlaceholder.svg"
            alt=""
            fill
            sizes="240px"
            className="object-cover object-center"
            unoptimized
          />
        </div>
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
  );
}

export function ExploreYourOptionsView() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-light font-sans">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">
            Explore your options.
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand/95 sm:self-auto sm:px-5 sm:text-base"
          >
            Download Zip
            <ArrowDownCircle
              className="size-5 shrink-0 text-white sm:size-6"
              strokeWidth={2}
              aria-hidden
            />
          </button>
        </header>

        <section className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden py-4 sm:py-6">
          <div className="flex min-h-0 w-full max-w-5xl flex-wrap items-center justify-center gap-6 overflow-hidden sm:gap-8 lg:gap-12">
            <IphonePreview />
            <IphonePreview />
            <IphonePreview />
          </div>
        </section>
      </div>
    </main>
  );
}
