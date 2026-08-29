export const nextActions = [
  "continue_chat",
  "pursuit_offer",
  "pursuit_decision",
  "show_booking_cta",
  "auto_advance",
  "end_chat",
] as const;

export type NextAction = (typeof nextActions)[number];

export const conversationActions = [
  "accept_pursuit",
  "decline_pursuit",
  "accept_pursuit_threshold",
  "keep_pursuit_preference",
  "continue_pursuit",
] as const;

export type ConversationAction = (typeof conversationActions)[number];

export const leadStatuses = [
  "qualified",
  "warm",
  "unqualified",
  "unknown",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const conversationStatuses = ["active", "completed"] as const;

export type ConversationStatus = (typeof conversationStatuses)[number];

export interface StartConversationRequest {
  name: string;
  email: string;
}

export interface ConversationResponse extends Record<string, unknown> {
  conversation_id: string;
  lead_id: string | null;
  response: string;
  conversation_status: ConversationStatus;
  lead_status: LeadStatus;
  qualification_complete: boolean;
  remaining_question_count: number;
  can_proceed: boolean;
  next_action: NextAction;
  current_metric: string | null;
}

export type ConversationStartResponse = ConversationResponse;

export interface ConversationTextMessageRequest {
  message: string;
  interaction_metric: string;
  action?: never;
}

export interface ConversationActionRequest {
  action: ConversationAction;
  message?: never;
  interaction_metric?: never;
}

export type SendConversationMessageRequest =
  | ConversationTextMessageRequest
  | ConversationActionRequest;

export type ConversationMessageRole = "assistant" | "user";
export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export interface ConversationUiMessage {
  id: string;
  role: ConversationMessageRole;
  content: string;
  action?: ConversationAction;
  deliveryStatus?: MessageDeliveryStatus;
}

export interface MetricConversationBlock {
  metric: string;
  messages: ConversationUiMessage[];
  isExpanded: boolean;
}

export interface ConversationUiState {
  conversation: ConversationResponse;
  blocks: MetricConversationBlock[];
  terminalMessages: ConversationUiMessage[];
}

export interface PendingConversationInteraction {
  request: SendConversationMessageRequest;
  owningMetric: string | null;
  messageId: string | null;
}

export type StartConversationFieldErrors = Partial<
  Record<keyof StartConversationRequest, string>
>;

export interface StartConversationValidationResult {
  payload: StartConversationRequest | null;
  errors: StartConversationFieldErrors;
}
