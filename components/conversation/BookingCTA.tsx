import Link from "next/link";
import { getBookingPath } from "@/lib/helpers";

interface BookingCTAProps {
  conversationId: string;
  canProceed: boolean;
}

export function BookingCTA({ conversationId, canProceed }: BookingCTAProps) {
  return (
    <section className="rounded-2xl border border-primary/25 bg-primary-fixed/35 p-5 sm:p-6" aria-labelledby="booking-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        Next step
      </p>
      <h3 id="booking-heading" className="mt-1.5">Ready to book a call?</h3>
      {canProceed ? (
        <Link
          href={getBookingPath(conversationId)}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[0.625rem] bg-primary-container px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Book a call
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-4 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-[0.625rem] bg-primary-container px-5 text-sm font-semibold text-on-primary opacity-45"
        >
          Booking unavailable
        </button>
      )}
    </section>
  );
}
