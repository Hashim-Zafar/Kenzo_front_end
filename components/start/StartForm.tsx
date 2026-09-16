"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, startConversation } from "@/lib/api";
import {
  getConversationPath,
  validateStartConversation,
} from "@/lib/helpers";
import { createInitialConversationUiState, persistConversationUiState } from "@/lib/conversation";
import type {
  StartConversationFieldErrors,
  StartConversationRequest,
} from "@/types/types";

const initialValues: StartConversationRequest = {
  name: "",
  email: "",
};

export function StartForm() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] =
    useState<StartConversationFieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  function updateField(field: keyof StartConversationRequest, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSubmissionError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionLock.current) {
      return;
    }

    const validation = validateStartConversation(values);
    setFieldErrors(validation.errors);
    setSubmissionError(null);

    if (!validation.payload) {
      if (validation.errors.name) {
        nameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      const conversation = await startConversation(validation.payload);
      persistConversationUiState(createInitialConversationUiState(conversation));
      router.push(getConversationPath(conversation.conversation_id));
    } catch (error: unknown) {
      console.error("Unable to start BookingFunnel conversation", error);
      setSubmissionError(
        error instanceof ApiError
          ? error.message
          : "We couldn't start the conversation. Please try again.",
      );
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-on-surface">
          Name
        </label>
        <input
          ref={nameInputRef}
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          required
          disabled={isSubmitting}
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          placeholder="Enter your full name"
          className="mt-1.5 h-11 w-full rounded-[0.625rem] border border-outline-variant/70 bg-surface-container-lowest px-3.5 text-sm text-on-surface outline-none transition-[border-color,box-shadow,background-color] duration-[var(--transition-interactive)] placeholder:text-outline-variant focus:border-primary focus:ring-2 focus:ring-primary-fixed disabled:cursor-not-allowed disabled:bg-surface-container-highest/45"
        />
        {fieldErrors.name ? (
          <p id="name-error" className="mt-1 text-xs text-error" role="alert">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="mt-2.5">
        <label htmlFor="email" className="block text-xs font-semibold text-on-surface">
          Email address
        </label>
        <input
          ref={emailInputRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          required
          disabled={isSubmitting}
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          placeholder="you@company.com"
          className="mt-1.5 h-11 w-full rounded-[0.625rem] border border-outline-variant/70 bg-surface-container-lowest px-3.5 text-sm text-on-surface outline-none transition-[border-color,box-shadow,background-color] duration-[var(--transition-interactive)] placeholder:text-outline-variant focus:border-primary focus:ring-2 focus:ring-primary-fixed disabled:cursor-not-allowed disabled:bg-surface-container-highest/45"
        />
        {fieldErrors.email ? (
          <p id="email-error" className="mt-1 text-xs text-error" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      {submissionError ? (
        <div
          className="mt-3 rounded-lg bg-error-container px-3 py-2.5 text-xs leading-5 text-on-error-container"
          role="alert"
          aria-live="assertive"
        >
          {submissionError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-[0.625rem] bg-primary-container px-5 text-sm font-medium text-on-primary shadow-sm transition-[background-color,transform,opacity] duration-[var(--transition-interactive)] hover:bg-primary active:translate-y-px disabled:cursor-wait disabled:opacity-65"
      >
        <span>{isSubmitting ? "Starting conversation…" : "Start with Kenzo"}</span>
        {isSubmitting ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/45 border-t-on-primary"
            aria-hidden="true"
          />
        ) : (
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <p className="mt-2.5 text-center text-[0.6875rem] leading-4 text-outline">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
