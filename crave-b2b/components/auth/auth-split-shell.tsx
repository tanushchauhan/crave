import Image from "next/image";
import { cn } from "@/lib/utils";

export function AuthSplitShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section
          className={cn(
            "relative flex flex-1 items-center justify-center bg-white px-8 py-12 md:py-0",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 motion-safe:ease-out motion-safe:fill-mode-both",
          )}
        >
          <Image
            src="/craveLogo.svg"
            alt=""
            width={283}
            height={283}
            className="max-h-[min(45vw,320px)] w-auto max-w-[min(55vw,280px)] object-contain md:max-h-[360px] md:max-w-[320px]"
            priority
          />
        </section>
        <section
          className={cn(
            "relative flex flex-1 flex-col bg-light shadow-[-16px_0_40px_-12px_rgba(0,0,0,0.12)] md:min-w-0",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:ease-out motion-safe:delay-100 motion-safe:fill-mode-both max-md:motion-safe:slide-in-from-bottom-2 md:motion-safe:slide-in-from-right-3",
          )}
        >
          <div className="flex flex-1 items-center justify-center px-8 py-12 md:py-16">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
