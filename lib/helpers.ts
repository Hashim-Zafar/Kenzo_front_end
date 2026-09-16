import {
  conversationActions,
  conversationStatuses,
  leadStatuses,
  nextActions,
} from "@/types/types";
import type {
  ConversationAction,
  ConversationResponse,
  ConversationStatus,
  LeadStatus,
  NextAction,
  MetricValue,
  UIDirective,
  StartConversationFieldErrors,
  StartConversationRequest,
  StartConversationValidationResult,
} from "@/types/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
): value is TValue {
  return (
    typeof value === "string" && allowedValues.some((item) => item === value)
  );
}

export function isNextAction(value: unknown): value is NextAction {
  return isOneOf(value, nextActions);
}

export function isConversationAction(
  value: unknown,
): value is ConversationAction {
  return isOneOf(value, conversationActions);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return isOneOf(value, leadStatuses);
}

export function isConversationStatus(
  value: unknown,
): value is ConversationStatus {
  return isOneOf(value, conversationStatuses);
}

export const directiveTypes = [
  "metric_question", "focus_metric", "metric_not_available_yet", "pursuit_offer",
  "pursuit_decision", "qualification_complete", "show_booking_cta",
  "hard_disqualification", "conversation_end",
];

function isMetricValue(value: unknown): value is MetricValue {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

export function isUIDirective(value: unknown): value is UIDirective {
  if (!isRecord(value) || !directiveTypes.includes(String(value.type))) return false;
  if (["focus_metric", "metric_not_available_yet", "pursuit_offer", "pursuit_decision", "metric_question"].includes(String(value.type))) {
    if (typeof value.metric !== "string" || !value.metric.trim()) return false;
  }
  if (value.type === "metric_question") {
    return typeof value.question === "string" &&
      (value.description === undefined || value.description === null || typeof value.description === "string") &&
      Array.isArray(value.examples) && value.examples.every(example => typeof example === "string") &&
      isRecord(value.ui) && isOneOf(value.ui.type, ["single_select", "boolean_choice", "number_input", "text_input"]) &&
      typeof value.ui.allow_custom === "boolean" && Array.isArray(value.ui.options) &&
      value.ui.options.every(option => isRecord(option) && typeof option.label === "string" && isMetricValue(option.value));
  }
  if (value.type === "pursuit_offer" || value.type === "pursuit_decision") {
    const fields = value.type === "pursuit_offer"
      ? [value.threshold, value.minimum_viable_threshold]
      : [value.threshold, value.proposed_value];
    return fields.every(v => v === null || typeof v === "string" || typeof v === "boolean" ||
      (typeof v === "number" && Number.isFinite(v)));
  }
  return true;
}

export function isConversationResponse(
  value: unknown,
): value is ConversationResponse {
  if (!isRecord(value)) {
    return false;
  }

  const currentMetricIsValid =
    value.current_metric === null ||
    (typeof value.current_metric === "string" &&
      value.current_metric.trim().length > 0);

  return (
    typeof value.conversation_id === "string" && value.conversation_id.trim().length > 0 &&
    (value.lead_id === null ||
      (typeof value.lead_id === "string" && value.lead_id.trim().length > 0)) &&
    typeof value.response === "string" &&
    isConversationStatus(value.conversation_status) &&
    isLeadStatus(value.lead_status) &&
    typeof value.qualification_complete === "boolean" &&
    typeof value.remaining_question_count === "number" &&
    Number.isInteger(value.remaining_question_count) &&
    value.remaining_question_count >= 0 &&
    typeof value.can_proceed === "boolean" &&
    isNextAction(value.next_action) &&
    Array.isArray(value.ui_directives) &&
    value.ui_directives.every(
      isUIDirective,
    ) &&
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

export function getConversationPath(conversationId: string): string {
  return `/conversations/${encodeURIComponent(conversationId)}`;
}

export function getBookingPath(conversationId: string): string {
  return `${getConversationPath(conversationId)}/booking`;
}
