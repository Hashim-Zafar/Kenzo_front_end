interface ConversationCompleteProps {
  canProceed: boolean;
}

export function ConversationComplete({ canProceed }: ConversationCompleteProps) {
  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-5 sm:p-6" aria-labelledby="complete-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">
        Conversation complete
      </p>
      <h3 id="complete-heading" className="mt-1.5">
        {canProceed ? "Qualification is finished." : "This qualification is now closed."}
      </h3>
      <p className="mt-2 text-sm">
        {canProceed
          ? "Kenzo has completed this qualification conversation."
          : "There are no more qualification questions or booking actions available."}
      </p>
    </section>
  );
}
