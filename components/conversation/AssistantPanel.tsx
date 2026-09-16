"use client";

import { useState } from "react";
import { ChatInput } from "./ChatInput";
import { KenzoTyping } from "./KenzoTyping";
import { MessageList } from "./MessageList";
import type { ConversationUiMessage } from "@/types/types";

export function AssistantPanel({ kind, messages, draft, disabled, pending, closed, onDraft, onSend }: {
  kind: "ask_kenzo" | "general_text";
  messages: ConversationUiMessage[];
  draft: string;
  disabled: boolean;
  pending: boolean;
  closed: boolean;
  onDraft: (value: string) => void;
  onSend: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const lastMessageId = messages.at(-1)?.id ?? null;
  const expanded = open || (lastMessageId !== null && lastMessageId !== closedAt);
  const ask = kind === "ask_kenzo";
  const title = ask ? "Ask Kenzo" : "Something else to share?";
  return (
    <section id={`panel-${kind}`} className="min-w-0 scroll-mt-6 rounded-2xl border border-outline-variant/45 bg-surface-container-lowest p-4 sm:p-5">
      <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-primary" aria-expanded={expanded} aria-controls={`content-${kind}`} onClick={() => { setOpen(!expanded); if (expanded) setClosedAt(lastMessageId); }}>
        {title}<span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <p className="text-xs">{ask ? "Questions about the agency? Your qualification stays right here." : "Share a correction, add context, or let Kenzo know you'd like to stop."}</p>
      <div id={`content-${kind}`} hidden={!expanded} className="mt-4 space-y-4">
        <MessageList messages={messages} />
        {pending ? <KenzoTyping label={ask ? "Kenzo is checking the agency knowledge…" : "Kenzo is updating your conversation…"} /> : null}
        {closed ? <p className="text-xs">This conversation is closed. You can still review your exchanges with Kenzo.</p> :
          <ChatInput metricLabel={ask ? "Ask Kenzo" : "General message"} disabled={disabled} value={draft} onChange={onDraft} onSubmit={onSend} placeholder={ask ? "What would you like to know?" : "Share what's on your mind…"} />}
      </div>
    </section>
  );
}
