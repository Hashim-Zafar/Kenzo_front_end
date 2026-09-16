import Image from "next/image";
import Link from "next/link";
import { getBookingPath } from "@/lib/helpers";
import { interpretDirectives } from "@/lib/ui-directives";
import type { ConversationResponse } from "@/types/types";

export function ConversationComplete({ conversation, messagesClosed = false }: { conversation: ConversationResponse; messagesClosed?: boolean }) {
  const view = interpretDirectives(conversation);
  const booking = view.showBooking && !messagesClosed;
  const title = booking ? "You're all set." : view.ended ? "Thanks for your time." : view.disqualified ? "Thank you for sharing your plans." : "Your conversation is now closed.";
  return (
    <section className="rounded-2xl border border-primary/20 bg-surface-container-low p-6 text-center sm:p-8" aria-labelledby="complete-heading">
      <Image src={booking ? "/kenzo_envelop.png" : "/kenzo_waving.png"} alt="Kenzo" width={180} height={295} className="mx-auto h-24 w-auto object-contain" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {messagesClosed ? "Conversation closed" : view.ended ? "Conversation ended" : view.disqualified ? "Not the right fit at this time" : conversation.qualification_complete ? "Qualification complete" : "Conversation complete"}
      </p>
      <h2 id="complete-heading" className="mt-2">{title}</h2>
      <p className="mt-3 text-sm">{booking ? "Your next step is to arrange a conversation with the team." : "You can review your conversation below."}</p>
      {booking && conversation.conversation_id ? <Link href={getBookingPath(conversation.conversation_id)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[0.625rem] bg-primary-container px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto">Choose a meeting time →</Link> : null}
    </section>
  );
}
