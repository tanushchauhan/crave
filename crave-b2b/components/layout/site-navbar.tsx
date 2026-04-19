import Image from "next/image";
import Link from "next/link";
import { CircleUser } from "lucide-react";

export function SiteNavbar() {
  return (
    <header className="flex h-16 pl-8 shrink-0 items-stretch bg-brand">
      <Link
        href="/"
        prefetch={false}
        className="relative min-h-0 min-w-0 flex-1"
        aria-label="crave home"
      >
        <Image
          src="/craveLogo.svg"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain object-left"
          style={{ filter: "brightness(0) invert(1)" }}
          priority
          unoptimized
        />
      </Link>
      <div className="flex shrink-0 items-center px-8 md:px-12 lg:px-16">
        <button
          type="button"
          className="rounded-full p-1 text-white transition-opacity hover:opacity-90"
          aria-label="Account"
        >
          <CircleUser className="size-8 stroke-[1.35]" strokeWidth={1.35} />
        </button>
      </div>
    </header>
  );
}
