"use client";

import { useEffect } from "react";
import { useConversation } from "@/features/conversation/use-conversation";
import { interactions } from "@/lib/interactions";
import { canInteractWithMetric, interpretDirectives } from "@/lib/ui-directives";
import { getMetricSectionId } from "@/lib/conversation";
import { ConversationComplete } from "./ConversationComplete";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { MetricBlock } from "./MetricBlock";
import { MetricNavigator } from "./MetricNavigator";
import { MissingConversationState } from "./MissingConversationState";
import { AssistantPanel } from "./AssistantPanel";

export function ConversationScreen({ conversationId }: { conversationId: string }) {
  const { state, hydrating, pending, failure, focus, storageUnavailable, send, updateDraft, expand } = useConversation(conversationId);
  useEffect(() => {
    if (!focus.signal) return;
    const target = document.getElementById(focus.panel ? `panel-${focus.panel}` : focus.metric ? getMetricSectionId(focus.metric) : "conversation-terminal");
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "nearest" });
    if (!reducedMotion && focus.metric) target.animate([
      { boxShadow: "0 0 0 3px rgb(166 58 189 / 18%)" }, { boxShadow: "0 0 0 0px rgb(166 58 189 / 0%)" },
    ], { duration: 1100 });
  }, [focus]);

  if (hydrating) return <main className="app-grid-background flex min-h-svh items-center justify-center" aria-busy="true"><p>Opening your conversation…</p></main>;
  if (!state) return <MissingConversationState />;
  const { conversation, blocks } = state;
  const view = interpretDirectives(conversation);
  const closed = view.terminal || Boolean(state.messagesClosed);
  const disabled = Boolean(pending) || closed;
  return (
    <main className="app-grid-background min-h-svh px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-4 lg:gap-5">
        <ConversationHeader conversation={conversation} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-5">
          <MetricNavigator blocks={blocks} activeMetric={closed ? null : view.activeMetric} onSelectMetric={metric => {
            expand(metric, true);
            window.requestAnimationFrame(() => document.getElementById(getMetricSectionId(metric))?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
          }} />
          <section className="min-w-0 rounded-[1.25rem] border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-sm sm:p-5 lg:p-6" aria-label="Qualification">
            <div className="flex min-w-0 flex-col gap-4">
              {storageUnavailable ? <p role="status" className="text-xs">Your browser can&apos;t save this session. Keep this tab open to retain your conversation.</p> : null}
              {failure ? <div role="alert" className="flex flex-col gap-3 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container sm:flex-row sm:items-center sm:justify-between">
                <span>{failure.message}</span>
                {failure.retryable ? <button type="button" disabled={Boolean(pending)} onClick={() => void send(failure.request)} className="min-h-11 shrink-0 rounded-[0.625rem] border border-error/25 bg-surface-container-lowest px-4 text-sm font-semibold disabled:opacity-50">Retry</button> : null}
              </div> : null}
              {closed ? <div id="conversation-terminal" className="scroll-mt-6 space-y-4">
                <ConversationComplete conversation={conversation} messagesClosed={state.messagesClosed} />
                <MessageList messages={state.terminalMessages} />
              </div> : null}
              {blocks.map(block => (
                <MetricBlock key={block.metric} block={block} isActive={!closed && block.metric === view.activeMetric}
                  editable={!closed && canInteractWithMetric(conversation, block.metric)} disabled={disabled}
                  pending={Boolean(pending && "metric" in pending && pending.metric === block.metric)}
                  focusSignal={!focus.panel && focus.metric === block.metric ? focus.signal : 0}
                  draft={state.drafts[`metric:${block.metric}`] ?? ""}
                  numericDraft={state.drafts[`number:${block.metric}`] ?? ""}
                  onNumericDraft={value => updateDraft(`number:${block.metric}`, value)}
                  onToggle={expand} onDraft={value => updateDraft(`metric:${block.metric}`, value)}
                  onSendText={message => void send(interactions.metricText(block.metric, message))}
                  onAnswer={value => void send(interactions.structuredAnswer(block.metric, value))}
                  onAction={(action, metric) => void send(interactions.action(action, metric))} />
              ))}
              {!blocks.length && !closed ? <p>Kenzo is ready. Share a message below to continue.</p> : null}
              {(["ask_kenzo", "general_text"] as const).map(kind => (
                <AssistantPanel key={kind} kind={kind} messages={kind === "ask_kenzo" ? state.askMessages : state.generalMessages}
                  draft={state.drafts[kind] ?? ""} disabled={disabled} closed={closed}
                  pending={pending?.type === kind} onDraft={value => updateDraft(kind, value)}
                  onSend={message => void send(kind === "ask_kenzo" ? interactions.askKenzo(message) : interactions.generalText(message))} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
