"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

interface ChatInputProps {
  metricLabel: string;
  disabled: boolean;
  focusSignal: number;
  isActive?: boolean;
  onSubmit: (message: string) => void;
}

export function ChatInput({
  metricLabel,
  disabled,
  focusSignal,
  isActive = false,
  onSubmit,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && focusSignal > 0 && !disabled) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [disabled, focusSignal, isActive]);

  function submitMessage() {
    const normalizedMessage = message.trim();

    if (!normalizedMessage || disabled) {
      return;
    }

    onSubmit(normalizedMessage);
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2" aria-label={`Respond about ${metricLabel}`}>
      <div className="min-w-0 flex-1">
        <label htmlFor={`message-${metricLabel}`} className="sr-only">
          Your response about {metricLabel}
        </label>
        <textarea
          ref={textareaRef}
          id={`message-${metricLabel}`}
          rows={1}
          value={message}
          disabled={disabled}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isActive ? "Type your answer…" : `Update ${metricLabel.toLowerCase()}…`}
          className="block min-h-12 max-h-36 w-full resize-y rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-on-surface outline-none transition-[border-color,box-shadow,background-color] duration-[var(--transition-interactive)] placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed disabled:cursor-not-allowed disabled:bg-surface-container-highest/45"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || message.trim().length === 0}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary transition-[background-color,opacity,transform] duration-[var(--transition-interactive)] hover:bg-primary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Send response"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 16V4m0 0L5.5 8.5M10 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
