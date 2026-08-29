import Image from "next/image";
import { getRemainingQuestionLabel } from "@/lib/conversation";
import type { ConversationResponse } from "@/types/types";

interface ConversationHeaderProps {
  conversation: ConversationResponse;
}

export function ConversationHeader({ conversation }: ConversationHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface/85 px-1 py-2 backdrop-blur-sm sm:px-2">
      <div className="flex min-w-0 items-center gap-3">
        <p className="shrink-0 text-[1.05rem] font-bold leading-none tracking-[-0.02em] text-on-surface">
          Single Grain
        </p>
        <span className="h-4 w-px bg-outline-variant" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high">
            <Image
              src="/kenzo_taking_user_input.png"
              alt=""
              width={167}
              height={276}
              className="h-8 w-auto object-contain"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5 text-on-surface">
              Chatting with Kenzo
            </p>
            <p className="text-xs leading-4 text-on-surface-variant">
              Lead qualification
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-full border border-outline-variant/50 bg-surface-container-lowest px-3 py-1.5">
        <p className="text-xs font-medium text-on-surface-variant">
          {conversation.qualification_complete
            ? "Qualification complete"
            : getRemainingQuestionLabel(conversation.remaining_question_count)}
        </p>
      </div>
    </header>
  );
}
