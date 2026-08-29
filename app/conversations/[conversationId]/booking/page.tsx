import Image from "next/image";
import Link from "next/link";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return (
    <main className="app-grid-background flex min-h-svh items-center justify-center px-5 py-10">
      <section className="w-full max-w-xl rounded-[1.25rem] border border-outline-variant/60 bg-surface-container-lowest p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <Image
          src="/kenzo_envelop.png"
          alt="Kenzo holding an envelope"
          width={171}
          height={271}
          className="mx-auto h-28 w-auto object-contain"
          priority
        />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Qualification complete
        </p>
        <h1 className="mt-2">Let&apos;s find a time that works.</h1>
        <p className="mx-auto mt-3 max-w-md">
          Scheduling is the next step for this conversation. Your qualification
          details have been preserved for the booking experience.
        </p>
        <Link
          href={`/conversations/${encodeURIComponent(conversationId)}`}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-[0.625rem] border border-outline-variant px-5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Review conversation
        </Link>
      </section>
    </main>
  );
}
