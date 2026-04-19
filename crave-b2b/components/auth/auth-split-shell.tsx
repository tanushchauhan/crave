import Image from "next/image";

export function AuthSplitShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section className="relative flex flex-1 items-center justify-center bg-white px-8 py-12 md:py-0">
          <Image
            src="/craveLogo.svg"
            alt=""
            width={283}
            height={283}
            className="max-h-[min(45vw,320px)] w-auto max-w-[min(55vw,280px)] object-contain md:max-h-[360px] md:max-w-[320px]"
            priority
          />
        </section>
        <section className="relative flex flex-1 flex-col bg-light shadow-[-16px_0_40px_-12px_rgba(0,0,0,0.12)] md:min-w-0">
          <div className="flex flex-1 items-center justify-center px-8 py-12 md:py-16">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
