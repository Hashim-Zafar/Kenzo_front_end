import Image from "next/image";
import Link from "next/link";

export function MissingConversationState() {
  return (
    <main className="app-grid-background flex min-h-svh items-center justify-center px-5 py-10">
      <section className="w-full max-w-lg rounded-[1.25rem] border border-outline-variant/60 bg-surface-container-lowest p-7 text-center shadow-[var(--shadow-card)] sm:p-9">
        <Image
          src="/kenzo_taking_user_input.png"
          alt="Kenzo taking notes"
          width={167}
          height={276}
          className="mx-auto h-28 w-auto object-contain"
          priority
        />
        <h1 className="mt-5">This conversation isn&apos;t available here.</h1>
        <p className="mt-3">
          This browser does not have the conversation&apos;s starting state. It may
          have been opened in another tab, browser, or device.
        </p>
        <Link
          href="/conversations/start"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-[0.625rem] bg-primary-container px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Start a new conversation
        </Link>
      </section>
    </main>
  );
}
