import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const gridSlots = Array.from({ length: 12 }, (_, i) => i);

export function AdCampaignStudioView() {
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

        <div className="mt-10 grid grid-cols-1 gap-8 lg:mt-12 lg:grid-cols-2 lg:gap-10">
          <section className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-dark">
              Prompt Box
            </h2>
            <Textarea
              name="prompt"
              placeholder="Enter here..."
              className="mt-3 min-h-[min(22rem,50vh)] w-full resize-y rounded-lg border-brand bg-white text-dark shadow-none placeholder:text-gray focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 md:text-sm"
            />
          </section>

          <section className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-dark">
              Image Uploads
            </h2>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {gridSlots.map((index) =>
                index === 0 ? (
                  <label
                    key="upload"
                    className="group relative aspect-[3/4] w-full min-h-0 cursor-pointer overflow-hidden rounded-lg"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                    />
                    <span className="flex size-full items-center justify-center bg-brand transition-opacity group-hover:opacity-95 group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-brand">
                      <Plus
                        className="size-8 text-white sm:size-10"
                        strokeWidth={3}
                        aria-hidden
                      />
                      <span className="sr-only">Upload images</span>
                    </span>
                  </label>
                ) : (
                  <div
                    key={index}
                    className="relative aspect-[3/4] w-full min-h-0 overflow-hidden rounded-lg bg-white ring-1 ring-brand/25"
                  >
                    <Image
                      src="/instaPicturePlaceholder.svg"
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 25vw, 180px"
                      className="object-cover object-center"
                      unoptimized
                    />
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <div className="mt-10 lg:mt-12">
          <Link
            href="/dashboard/ad-campaign-studio/explore"
            className="flex w-full items-center justify-center rounded-lg bg-brand py-4 text-center text-base font-bold text-white transition-colors hover:bg-brand/95 sm:text-lg"
          >
            Generate Instagram Carousel
          </Link>
        </div>
      </div>
    </main>
  );
}
