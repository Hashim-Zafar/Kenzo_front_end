"use client";

import { ChatInput } from "./ChatInput";
import { KenzoTyping } from "./KenzoTyping";
import { MessageList } from "./MessageList";
import { PursuitChoices } from "./PursuitChoices";
import { formatMetricLabel, getMetricSectionId } from "@/lib/conversation";
import type { ConversationAction, MetricConversationBlock, MetricValue } from "@/types/types";

interface MetricBlockProps {
  block: MetricConversationBlock;
  isActive: boolean;
  editable: boolean;
  disabled: boolean;
  pending: boolean;
  focusSignal: number;
  draft: string;
  numericDraft: string;
  onNumericDraft: (value: string) => void;
  onToggle: (metric: string, expanded: boolean) => void;
  onDraft: (value: string) => void;
  onSendText: (message: string) => void;
  onAnswer: (value: MetricValue) => void;
  onAction: (action: ConversationAction, metric: string) => void;
}

export function MetricBlock({ block, isActive, editable, disabled, pending, focusSignal, draft, numericDraft, onNumericDraft, onToggle, onDraft, onSendText, onAnswer, onAction }: MetricBlockProps) {
  const label = formatMetricLabel(block.metric);
  const sectionId = getMetricSectionId(block.metric);
  const lastSubmission = [...block.messages].reverse().find(message => message.role === "user" && !message.action)?.content;
  const control = block.question?.ui;
  const options = control?.options ?? [];
  const hasChoices = (control?.type === "single_select" || control?.type === "boolean_choice") && !block.pursuit;
  const numeric = control?.type === "number_input" && !block.pursuit;
  const textInput = block.pursuit || !control || control.type === "text_input" || control.allow_custom;
  // Avoid repeating the opening question verbatim in the history below its heading.
  const messages = block.messages.filter((message, index) => !(index === 0 && message.role === "assistant" && message.content === block.question?.question));
  return (
    <section id={sectionId} className={`min-w-0 scroll-mt-6 rounded-2xl border bg-surface-container-lowest transition-[border-color,box-shadow] duration-200 ${isActive ? "border-primary/30 shadow-[var(--shadow-card)] ring-1 ring-primary/10" : "border-outline-variant/45"}`} aria-labelledby={`${sectionId}-heading`}>
      <button type="button" onClick={() => onToggle(block.metric, !block.isExpanded)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-primary sm:px-5"
        aria-expanded={block.isExpanded} aria-controls={`${sectionId}-content`}>
        <span className="min-w-0">
          <span id={`${sectionId}-heading`} className="block break-words text-base font-bold text-on-surface">{label}</span>
          <span className={`mt-0.5 block text-xs font-medium ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
            {isActive ? block.pursuit ? "Current question · Discussing your preference" : "Current question" : "Earlier in this conversation"}
          </span>
          {!block.isExpanded && lastSubmission ? <span className="mt-2 block truncate text-sm text-on-surface-variant">You: {lastSubmission}</span> : null}
        </span>
        <svg viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 text-outline transition-transform ${block.isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* Keep draft controls mounted while collapsed, so toggling never loses input. */}
      <div id={`${sectionId}-content`} hidden={!block.isExpanded} className="border-t border-outline-variant/35 px-4 py-5 sm:px-6 sm:py-6">
        {block.question ? <div className="mb-5 space-y-2">
          <p className="text-xs font-semibold text-primary">Kenzo</p>
          <h3 className="whitespace-pre-wrap [overflow-wrap:anywhere]">{block.question.question}</h3>
          {block.question.description ? <p className="text-sm text-on-surface-variant">{block.question.description}</p> : null}
        </div> : null}
        <MessageList messages={messages} />
        {pending ? <div className="mt-5"><KenzoTyping label={block.pursuit ? "Kenzo is thinking this through…" : "Kenzo is checking that…"} /></div> : null}
        {editable ? <div className="mt-5 space-y-4 border-t border-outline-variant/30 pt-5">
          {block.pursuit ? <PursuitChoices pursuit={block.pursuit} disabled={disabled} onAction={onAction} /> : null}
          {hasChoices ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{options.map((option, index) => (
            <button key={index} type="button" disabled={disabled} onClick={() => onAnswer(option.value)} className="min-h-11 rounded-[0.625rem] border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container-low disabled:opacity-50">{option.label}</button>
          ))}</div> : null}
          {numeric ? <form className="flex gap-2" onSubmit={event => {
            event.preventDefault();
            if (!disabled && numericDraft.trim() && Number.isFinite(Number(numericDraft))) onAnswer(Number(numericDraft));
          }}>
            <input type="number" step="any" required value={numericDraft} onChange={event => onNumericDraft(event.target.value)} disabled={disabled} aria-label={label} className="min-w-0 flex-1 rounded-xl border border-outline-variant px-4 py-3" />
            <button disabled={disabled || !numericDraft.trim() || !Number.isFinite(Number(numericDraft))} className="rounded-xl bg-primary-container px-4 text-on-primary disabled:opacity-50">Send</button>
          </form> : null}
          {textInput ? <ChatInput metricLabel={`Your response about ${label}`} disabled={disabled} focusSignal={block.isExpanded ? focusSignal : 0} value={draft} onChange={onDraft} onSubmit={onSendText} placeholder={block.pursuit ? "Share your thoughts with Kenzo…" : "Type your own answer..."} /> : null}
          {block.question && block.question.examples.length > 0 ? <details key={JSON.stringify(block.question.examples)} className="text-xs text-on-surface-variant">
            <summary className="w-fit cursor-pointer py-2 hover:text-primary">Show examples</summary>
            <ul className="mt-1 list-disc space-y-1 pl-5">{block.question.examples.map((example, index) => <li key={index}>{example}</li>)}</ul>
          </details> : null}
          <div className="flex flex-wrap items-start gap-x-4 text-xs text-on-surface-variant">
            <button type="button" disabled={disabled} onClick={() => onAction("explain_question", block.metric)} className="py-2 underline-offset-4 hover:text-primary hover:underline disabled:opacity-50">Why are you asking this?</button>
            <details>
              <summary className="cursor-pointer py-2 hover:text-primary">More question actions</summary>
              <button type="button" disabled={disabled} onClick={() => onAction("repeat_question", block.metric)} className="py-2 underline-offset-4 hover:text-primary hover:underline disabled:opacity-50">Repeat question</button>
            </details>
          </div>
        </div> : null}
      </div>
    </section>
  );
}
