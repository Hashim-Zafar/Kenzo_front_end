import {
  conversationActions,
  conversationStatuses,
  leadStatuses,
  nextActions,
} from "@/types/types";
import type {
  ConversationAction,
  ConversationResponse,
  ConversationStartResponse,
  ConversationStatus,
  LeadStatus,
  NextAction,
  StartConversationFieldErrors,
  StartConversationRequest,
  StartConversationValidationResult,
} from "@/types/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const conversationStorageKey = "bookingfunnel.active-conversation";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
): value is TValue {
  return typeof value === "string" && allowedValues.some((item) => item === value);
}

export function isNextAction(value: unknown): value is NextAction {
  return isOneOf(value, nextActions);
}

export function isConversationAction(value: unknown): value is ConversationAction {
  return isOneOf(value, conversationActions);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return isOneOf(value, leadStatuses);
}

export function isConversationStatus(value: unknown): value is ConversationStatus {
  return isOneOf(value, conversationStatuses);
}

export function isConversationResponse(value: unknown): value is ConversationResponse {
  if (!isRecord(value)) {
    return false;
  }

  const currentMetricIsValid =
    value.current_metric === null ||
    (typeof value.current_metric === "string" && value.current_metric.trim().length > 0);

  return (
    typeof value.conversation_id === "string" &&
    value.conversation_id.trim().length > 0 &&
    (value.lead_id === null ||
      (typeof value.lead_id === "string" && value.lead_id.trim().length > 0)) &&
    typeof value.response === "string" &&
    value.response.trim().length > 0 &&
    isConversationStatus(value.conversation_status) &&
    isLeadStatus(value.lead_status) &&
    typeof value.qualification_complete === "boolean" &&
    typeof value.remaining_question_count === "number" &&
    Number.isInteger(value.remaining_question_count) &&
    value.remaining_question_count >= 0 &&
    typeof value.can_proceed === "boolean" &&
    isNextAction(value.next_action) &&
    currentMetricIsValid
  );
}

export function buildApiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function validateStartConversation(
  values: StartConversationRequest,
): StartConversationValidationResult {
  const payload: StartConversationRequest = {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
  };
  const errors: StartConversationFieldErrors = {};

  if (!payload.name) {
    errors.name = "Enter your name.";
  }

  if (!payload.email) {
    errors.email = "Enter your email address.";
  } else if (!emailPattern.test(payload.email)) {
    errors.email = "Enter a valid email address.";
  }

  return {
    payload: Object.keys(errors).length === 0 ? payload : null,
    errors,
  };
}

function getConversationResponseStorageKey(conversationId: string): string {
  return `bookingfunnel.conversation-response:${conversationId}`;
}

export function persistConversation(
  conversation: ConversationStartResponse,
  storage: Storage,
): void {
  const serializedConversation = JSON.stringify(conversation);
  storage.setItem(conversationStorageKey, serializedConversation);
  storage.setItem(
    getConversationResponseStorageKey(conversation.conversation_id),
    serializedConversation,
  );
}

function parseStoredConversation(value: string | null): ConversationResponse | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(value);
    return isConversationResponse(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function loadConversation(
  conversationId: string,
  storage: Storage,
): ConversationResponse | null {
  const conversationSpecificResponse = parseStoredConversation(
    storage.getItem(getConversationResponseStorageKey(conversationId)),
  );

  if (conversationSpecificResponse?.conversation_id === conversationId) {
    return conversationSpecificResponse;
  }

  const activeConversation = parseStoredConversation(
    storage.getItem(conversationStorageKey),
  );

  return activeConversation?.conversation_id === conversationId
    ? activeConversation
    : null;
}

export function getConversationPath(conversationId: string): string {
  return `/conversations/${encodeURIComponent(conversationId)}`;
}

export function getBookingPath(conversationId: string): string {
  return `${getConversationPath(conversationId)}/booking`;
}
