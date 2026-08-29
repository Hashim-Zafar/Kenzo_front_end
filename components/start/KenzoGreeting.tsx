import Image from "next/image";

export function KenzoGreeting() {
  return (
    <aside className="flex flex-col bg-surface px-6 py-9 sm:px-10 md:px-10 md:py-10">
      <Image
        src="/kenzo_waving.png"
        alt="Kenzo, a friendly purple fox, waving"
        width={180}
        height={295}
        priority
        className="h-auto w-[6.375rem] self-center object-contain sm:self-start"
      />

      <div className="mt-6">
        <h1>Hey, I&apos;m Kenzo.</h1>
        <p className="mt-3 max-w-[17rem] leading-[1.55]">
          I&apos;ll guide you through a few quick questions, help with anything
          you&apos;re unsure about, and if it looks like a good fit, I&apos;ll help you
          book a meeting.
        </p>
      </div>

      <p className="mt-7 max-w-full self-start rounded-[0.45rem] bg-primary-fixed/60 px-2.5 py-1.5 text-[0.625rem] font-semibold leading-[1.35] whitespace-nowrap text-on-primary-fixed-variant">
        Usually takes 2–3 minutes · Ask questions anytime
      </p>
    </aside>
  );
}
