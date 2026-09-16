"use client";

import { useEffect, useId, useRef } from "react";

interface ChatInputProps {
  metricLabel: string;
  disabled: boolean;
  focusSignal?: number;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
}

export function ChatInput({ metricLabel, disabled, focusSignal = 0, value, placeholder = "Type your answer…", onChange, onSubmit }: ChatInputProps) {
  const inputId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef(0);
  useEffect(() => {
    if (focusSignal > lastFocus.current && !disabled) {
      lastFocus.current = focusSignal;
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [disabled, focusSignal]);
  function submit() {
    if (value.trim() && !disabled) onSubmit(value.trim());
  }
  return (
    <form onSubmit={event => { event.preventDefault(); submit(); }} className="flex items-end gap-2" aria-label={metricLabel}>
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">{metricLabel}</label>
        <textarea
          id={inputId} ref={textareaRef} rows={2} value={value} disabled={disabled}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault(); submit();
            }
          }}
          placeholder={placeholder}
          className="block min-h-12 max-h-44 w-full resize-y rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 text-base leading-6 text-on-surface outline-none transition-[border-color,box-shadow,background-color] duration-[var(--transition-interactive)] placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed disabled:cursor-not-allowed disabled:bg-surface-container-highest/45 sm:text-sm"
        />
      </div>
      <button type="submit" disabled={disabled || !value.trim()}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-45" aria-label="Send response">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 16V4m0 0L5.5 8.5M10 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
