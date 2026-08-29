import Image from "next/image";
import type { ConversationUiMessage } from "@/types/types";

interface MessageListProps {
  messages: ConversationUiMessage[];
}

function MessageBubble({ message }: { message: ConversationUiMessage }) {
  if (message.role === "assistant") {
    return (
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-10 w-9 shrink-0 items-start justify-center" aria-hidden="true">
          <Image
            src="/kenzo_waving.png"
            alt=""
            width={180}
            height={295}
            className="h-10 w-auto object-contain"
          />
        </span>
        <div className="max-w-[min(42rem,88%)] rounded-2xl rounded-tl-sm border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-on-surface sm:px-5">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 pl-8 sm:pl-16">
      <div className="max-w-[min(38rem,90%)] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-on-primary sm:px-5">
        {message.content}
      </div>
      {message.deliveryStatus === "sending" ? (
        <span className="text-[0.6875rem] text-outline">Sending…</span>
      ) : null}
      {message.deliveryStatus === "failed" ? (
        <span className="text-[0.6875rem] font-medium text-error">Not sent</span>
      ) : null}
    </div>
  );
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
