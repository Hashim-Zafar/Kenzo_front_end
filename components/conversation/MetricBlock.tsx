"use client";

import { ChatInput } from "./ChatInput";
import { ConversationActions } from "./ConversationActions";
import { KenzoTyping } from "./KenzoTyping";
import { MessageList } from "./MessageList";
import {
  formatMetricLabel,
  getMetricSectionId,
} from "@/lib/conversation";
import type {
  ConversationAction,
  ConversationResponse,
  MetricConversationBlock,
} from "@/types/types";

interface MetricBlockProps {
  block: MetricConversationBlock;
  conversation: ConversationResponse;
  isActive: boolean;
  controlsDisabled: boolean;
  isPendingHere: boolean;
  canRevisit: boolean;
  focusSignal: number;
  onToggle: (metric: string, isExpanded: boolean) => void;
  onSendText: (metric: string, message: string) => void;
  onAction: (action: ConversationAction) => void;
}

export function MetricBlock({
  block,
  conversation,
  isActive,
  controlsDisabled,
  isPendingHere,
  canRevisit,
  focusSignal,
  onToggle,
  onSendText,
  onAction,
}: MetricBlockProps) {
  const metricLabel = formatMetricLabel(block.metric);
  const sectionId = getMetricSectionId(block.metric);

  return (
    <section
      id={sectionId}
      className={`scroll-mt-24 rounded-2xl border bg-surface-container-lowest transition-[border-color,box-shadow,background-color] duration-[var(--transition-interactive)] ${
        isActive
          ? "border-primary/30 shadow-[var(--shadow-card)] ring-1 ring-primary/10"
          : "border-outline-variant/45"
      }`}
      aria-labelledby={`${sectionId}-heading`}
    >
      <button
        type="button"
        onClick={() => onToggle(block.metric, !block.isExpanded)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary sm:px-5"
        aria-expanded={block.isExpanded}
        aria-controls={`${sectionId}-content`}
      >
        <span className="min-w-0">
          <span id={`${sectionId}-heading`} className="block truncate text-base font-bold text-on-surface">
            {metricLabel}
          </span>
          <span className={`mt-0.5 block text-xs font-medium ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
            {isActive ? "Current section" : "Previous section · Open to review or update"}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-5 w-5 shrink-0 text-outline transition-transform ${block.isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {block.isExpanded ? (
        <div id={`${sectionId}-content`} className="border-t border-outline-variant/35 px-4 py-5 sm:px-6 sm:py-6">
          <MessageList messages={block.messages} />

          {isPendingHere ? (
            <div className="mt-5">
              <KenzoTyping />
            </div>
          ) : null}

          <div className="mt-6 border-t border-outline-variant/30 pt-5">
            {isActive ? (
              <ConversationActions
                nextAction={conversation.next_action}
                metric={conversation.current_metric}
                metricLabel={metricLabel}
                conversationId={conversation.conversation_id}
                canProceed={conversation.can_proceed}
                disabled={controlsDisabled || conversation.conversation_status === "completed"}
                focusSignal={focusSignal}
                onSendText={onSendText}
                onAction={onAction}
              />
            ) : canRevisit ? (
              <ChatInput
                metricLabel={metricLabel}
                disabled={controlsDisabled}
                focusSignal={focusSignal}
                onSubmit={(message) => onSendText(block.metric, message)}
              />
            ) : (
              <p className="text-xs text-outline">This section is available for review.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
