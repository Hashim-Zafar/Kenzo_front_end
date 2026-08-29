"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationActions } from "./ConversationActions";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { MetricBlock } from "./MetricBlock";
import { MetricNavigator } from "./MetricNavigator";
import { MissingConversationState } from "./MissingConversationState";
import { ApiError, sendConversationMessage } from "@/lib/api";
import {
  appendPendingInteraction,
  applyConversationResponse,
  createConversationMessageId,
  createInitialConversationUiState,
  getMetricSectionId,
  getRequestDisplayContent,
  loadConversationUiState,
  persistConversationUiState,
  setMetricExpanded,
  updateMessageDelivery,
} from "@/lib/conversation";
import {
  getBookingPath,
  loadConversation,
  persistConversation,
} from "@/lib/helpers";
import type {
  ConversationAction,
  ConversationUiState,
  PendingConversationInteraction,
  SendConversationMessageRequest,
} from "@/types/types";

interface ConversationScreenProps {
  conversationId: string;
}

export function ConversationScreen({ conversationId }: ConversationScreenProps) {
  const router = useRouter();
  const [conversationState, setConversationState] =
    useState<ConversationUiState | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [pendingInteraction, setPendingInteraction] =
    useState<PendingConversationInteraction | null>(null);
  const [lastFailedInteraction, setLastFailedInteraction] =
    useState<PendingConversationInteraction | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isConversationUnavailable, setIsConversationUnavailable] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const submissionLock = useRef(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const storedUiState = loadConversationUiState(
        conversationId,
        window.sessionStorage,
      );
      const initialConversation = loadConversation(
        conversationId,
        window.sessionStorage,
      );

      setConversationState(
        storedUiState ??
          (initialConversation
            ? createInitialConversationUiState(initialConversation)
            : null),
      );
      setIsHydrating(false);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [conversationId]);

  useEffect(() => {
    if (conversationState) {
      try {
        persistConversationUiState(conversationState, window.sessionStorage);
        persistConversation(conversationState.conversation, window.sessionStorage);
      } catch (error: unknown) {
        console.warn("Unable to persist BookingFunnel conversation state", error);
      }
    }
  }, [conversationState]);

  useEffect(() => {
    if (conversationState?.conversation.next_action !== "auto_advance") {
      return;
    }

    const navigationTimer = window.setTimeout(() => {
      router.replace(getBookingPath(conversationId));
    }, 900);

    return () => window.clearTimeout(navigationTimer);
  }, [conversationId, conversationState?.conversation.next_action, router]);

  const scrollToResponse = useCallback((metric: string | null) => {
    window.requestAnimationFrame(() => {
      const targetId = metric ? getMetricSectionId(metric) : "conversation-terminal";
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, []);

  const submitInteraction = useCallback(
    async (
      request: SendConversationMessageRequest,
      owningMetric: string | null,
      existingMessageId: string | null = null,
    ) => {
      if (submissionLock.current) {
        return;
      }

      const interaction: PendingConversationInteraction = {
        request,
        owningMetric,
        messageId: existingMessageId ?? (owningMetric ? createConversationMessageId() : null),
      };

      submissionLock.current = true;
      setPendingInteraction(interaction);
      setSubmissionError(null);
      setConversationState((currentState) => {
        if (!currentState) {
          return currentState;
        }

        return existingMessageId
          ? updateMessageDelivery(currentState, existingMessageId, "sending")
          : appendPendingInteraction(
              currentState,
              interaction,
              getRequestDisplayContent(request),
            );
      });

      try {
        const response = await sendConversationMessage(conversationId, request);

        setConversationState((currentState) =>
          currentState
            ? applyConversationResponse(currentState, response, interaction.messageId)
            : currentState,
        );
        setLastFailedInteraction(null);

        if ("message" in request && response.next_action === "continue_chat") {
          setFocusSignal((currentSignal) => currentSignal + 1);
        }

        scrollToResponse(response.current_metric);
      } catch (error: unknown) {
        console.error("Unable to continue BookingFunnel conversation", error);
        const conversationIsUnavailable =
          error instanceof ApiError &&
          (error.status === 404 || error.status === 409 || error.status === 410);
        setConversationState((currentState) =>
          currentState
            ? updateMessageDelivery(currentState, interaction.messageId, "failed")
            : currentState,
        );
        setSubmissionError(
          error instanceof ApiError
            ? error.message
            : "We couldn't send that to Kenzo. Please try again.",
        );
        setIsConversationUnavailable(conversationIsUnavailable);
        setLastFailedInteraction(conversationIsUnavailable ? null : interaction);
      } finally {
        submissionLock.current = false;
        setPendingInteraction(null);
      }
    },
    [conversationId, scrollToResponse],
  );

  function handleSendText(metric: string, message: string) {
    void submitInteraction({ message, interaction_metric: metric }, metric);
  }

  function handleAction(action: ConversationAction) {
    const owningMetric = conversationState?.conversation.current_metric ?? null;
    void submitInteraction({ action }, owningMetric);
  }

  function handleRetry() {
    if (!lastFailedInteraction) {
      return;
    }

    void submitInteraction(
      lastFailedInteraction.request,
      lastFailedInteraction.owningMetric,
      lastFailedInteraction.messageId,
    );
  }

  function handleToggleMetric(metric: string, isExpanded: boolean) {
    setConversationState((currentState) =>
      currentState
        ? setMetricExpanded(currentState, metric, isExpanded)
        : currentState,
    );
  }

  function handleSelectMetric(metric: string) {
    handleToggleMetric(metric, true);
    window.requestAnimationFrame(() => {
      document.getElementById(getMetricSectionId(metric))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  if (isHydrating) {
    return (
      <main className="app-grid-background flex min-h-svh items-center justify-center" aria-busy="true">
        <p className="text-sm font-medium text-on-surface-variant">Opening your conversation…</p>
      </main>
    );
  }

  if (!conversationState) {
    return <MissingConversationState />;
  }

  const { conversation, blocks, terminalMessages } = conversationState;
  const isPending = pendingInteraction !== null;
  const controlsDisabled = isPending || isConversationUnavailable;
  const canRevisit =
    !isConversationUnavailable &&
    conversation.conversation_status !== "completed" &&
    !conversation.qualification_complete &&
    conversation.next_action !== "show_booking_cta" &&
    conversation.next_action !== "auto_advance" &&
    conversation.next_action !== "end_chat";

  return (
    <main className="app-grid-background min-h-svh px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4 lg:h-[calc(100svh-3rem)] lg:gap-5">
        <ConversationHeader conversation={conversation} />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-5">
          <MetricNavigator
            blocks={blocks}
            activeMetric={conversation.current_metric}
            onSelectMetric={handleSelectMetric}
          />

          <section className="min-w-0 rounded-[1.25rem] border border-outline-variant/50 bg-surface-container-lowest shadow-sm lg:min-h-0 lg:overflow-y-auto" aria-label="Qualification conversation">
            <div className="flex flex-col gap-4 p-3 sm:p-5 lg:p-6">
              {submissionError ? (
                <div className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container sm:flex-row sm:items-center sm:justify-between" role="alert">
                  <span>{submissionError}</span>
                  {lastFailedInteraction ? (
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={isPending}
                      className="min-h-9 shrink-0 rounded-lg border border-error/25 bg-surface-container-lowest px-3 text-xs font-semibold text-on-error-container disabled:cursor-wait disabled:opacity-50"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              ) : null}

              {blocks.map((block) => (
                <MetricBlock
                  key={block.metric}
                  block={block}
                  conversation={conversation}
                  isActive={block.metric === conversation.current_metric}
                  controlsDisabled={controlsDisabled}
                  isPendingHere={pendingInteraction?.owningMetric === block.metric}
                  canRevisit={canRevisit}
                  focusSignal={focusSignal}
                  onToggle={handleToggleMetric}
                  onSendText={handleSendText}
                  onAction={handleAction}
                />
              ))}

              {conversation.current_metric === null ? (
                <section id="conversation-terminal" className="scroll-mt-24 rounded-2xl border border-outline-variant/45 bg-surface-container-lowest p-4 sm:p-6">
                  {terminalMessages.length > 0 ? (
                    <div className="mb-6">
                      <MessageList messages={terminalMessages} />
                    </div>
                  ) : null}
                  <ConversationActions
                    nextAction={conversation.next_action}
                    metric={null}
                    metricLabel="Conversation"
                    conversationId={conversationId}
                    canProceed={conversation.can_proceed}
                    disabled={controlsDisabled}
                    focusSignal={focusSignal}
                    onSendText={handleSendText}
                    onAction={handleAction}
                  />
                </section>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
