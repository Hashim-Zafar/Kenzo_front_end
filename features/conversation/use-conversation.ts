"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, sendInteraction } from "@/lib/api";
import { applyConversationResponse, loadConversationUiState, persistConversationUiState, setMetricExpanded } from "@/lib/conversation";
import { canInteractWithMetric, interpretDirectives } from "@/lib/ui-directives";
import type { ConversationUiState, Interaction } from "@/types/types";

export function useConversation(conversationId: string) {
  const [state, setState] = useState<ConversationUiState | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [pending, setPending] = useState<Interaction | null>(null);
  const [failure, setFailure] = useState<{ message: string; request: Interaction; retryable: boolean } | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [focus, setFocus] = useState<{ metric: string | null; signal: number; panel?: "general_text" }>({ metric: null, signal: 0 });
  const current = useRef<ConversationUiState | null>(null);
  const lock = useRef(false);

  const commit = useCallback((next: ConversationUiState) => {
    current.current = next;
    setState(next);
    setStorageUnavailable(!persistConversationUiState(next));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadConversationUiState(conversationId);
      if (saved) commit(saved);
      setHydrating(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [conversationId, commit]);

  const send = useCallback(async (request: Interaction) => {
    const session = current.current;
    if (lock.current || !session || session.messagesClosed || !interpretDirectives(session.conversation).acceptsInput) return;
    if ("metric" in request && request.metric &&
      (!session.blocks.some(block => block.metric === request.metric) || !canInteractWithMetric(session.conversation, request.metric))) return;
    lock.current = true;
    setPending(request);
    setFailure(null);
    try {
      const response = await sendInteraction(conversationId, request);
      const next = applyConversationResponse(current.current ?? session, response, request);
      commit(next);
      const view = interpretDirectives(next.conversation);
      const explicitFocus = response.ui_directives.some(d => d.type === "focus_metric");
      if (view.terminal || explicitFocus || request.type !== "ask_kenzo") {
        const missingFocus = !next.blocks.some(block => block.metric === view.focusMetric);
        const unavailable = response.ui_directives.some(d => d.type === "metric_not_available_yet");
        const panel = !view.terminal && (missingFocus || unavailable || (request.type === "general_text" && !explicitFocus))
          ? "general_text" as const : undefined;
        setFocus(previous => ({ metric: view.terminal ? null : view.focusMetric, panel, signal: previous.signal + 1 }));
      }
    } catch (error) {
      const closed = error instanceof ApiError && [404, 409, 410].includes(error.status ?? 0);
      if (closed) commit({ ...(current.current ?? session), messagesClosed: true });
      setFailure({
        message: error instanceof ApiError ? error.message : "We couldn't process that response. Please try again.",
        request, retryable: !closed,
      });
    } finally {
      lock.current = false;
      setPending(null);
    }
  }, [conversationId, commit]);

  function updateDraft(key: string, value: string) {
    if (current.current) commit({ ...current.current, drafts: { ...current.current.drafts, [key]: value } });
    // An edited draft supersedes the failed request; Send now submits the edited text.
    if (failure) setFailure(null);
  }
  function expand(metric: string, expanded: boolean) {
    if (current.current) commit(setMetricExpanded(current.current, metric, expanded));
  }
  return { state, hydrating, pending, failure, focus, storageUnavailable, send, updateDraft, expand };
}
