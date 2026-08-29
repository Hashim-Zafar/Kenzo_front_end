"use client";

import type { ReactNode } from "react";
import { BookingCTA } from "./BookingCTA";
import { ChatInput } from "./ChatInput";
import { ConversationComplete } from "./ConversationComplete";
import { conversationActionLabels } from "@/lib/conversation";
import type { ConversationAction, NextAction } from "@/types/types";

interface ConversationActionsProps {
  nextAction: NextAction;
  metric: string | null;
  metricLabel: string;
  conversationId: string;
  canProceed: boolean;
  disabled: boolean;
  focusSignal: number;
  onSendText: (metric: string, message: string) => void;
  onAction: (action: ConversationAction) => void;
}

interface DeterministicActionsProps {
  actions: ConversationAction[];
  disabled: boolean;
  onAction: (action: ConversationAction) => void;
}

function DeterministicActions({
  actions,
  disabled,
  onAction,
}: DeterministicActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label="Choose how to continue">
      {actions.map((action, index) => (
        <button
          key={action}
          type="button"
          disabled={disabled}
          onClick={() => onAction(action)}
          className={`min-h-11 rounded-[0.625rem] px-4 text-sm font-semibold transition-[background-color,border-color,color,opacity,transform] duration-[var(--transition-interactive)] active:translate-y-px disabled:cursor-wait disabled:opacity-55 ${
            index === 0
              ? "bg-primary-container text-on-primary hover:bg-primary"
              : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/45 hover:bg-surface-container-low"
          }`}
        >
          {conversationActionLabels[action]}
        </button>
      ))}
    </div>
  );
}

function InconsistentActionState() {
  return (
    <div className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
      Kenzo could not determine which section should receive your response. Refresh the page or return to the start screen.
    </div>
  );
}

function assertUnreachable(value: never): never {
  throw new Error(`Unsupported conversation action: ${String(value)}`);
}

export function ConversationActions({
  nextAction,
  metric,
  metricLabel,
  conversationId,
  canProceed,
  disabled,
  focusSignal,
  onSendText,
  onAction,
}: ConversationActionsProps): ReactNode {
  switch (nextAction) {
    case "continue_chat":
      return metric ? (
        <ChatInput
          metricLabel={metricLabel}
          disabled={disabled}
          focusSignal={focusSignal}
          isActive
          onSubmit={(message) => onSendText(metric, message)}
        />
      ) : (
        <InconsistentActionState />
      );

    case "pursuit_offer":
      return (
        <DeterministicActions
          actions={["accept_pursuit", "decline_pursuit"]}
          disabled={disabled}
          onAction={onAction}
        />
      );

    case "pursuit_decision":
      return (
        <DeterministicActions
          actions={[
            "accept_pursuit_threshold",
            "keep_pursuit_preference",
            "continue_pursuit",
          ]}
          disabled={disabled}
          onAction={onAction}
        />
      );

    case "show_booking_cta":
      return (
        <BookingCTA conversationId={conversationId} canProceed={canProceed} />
      );

    case "auto_advance":
      return (
        <div className="rounded-2xl border border-primary/25 bg-primary-fixed/35 p-5" role="status">
          <p className="text-sm font-semibold text-on-surface">Moving you to the next step…</p>
        </div>
      );

    case "end_chat":
      return <ConversationComplete canProceed={canProceed} />;

    default:
      return assertUnreachable(nextAction);
  }
}
