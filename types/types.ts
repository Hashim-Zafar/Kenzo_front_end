export const nextActions = [
  "continue_chat",
  "show_booking_cta",
  "auto_advance",
  "end_chat",
] as const;

export type NextAction = (typeof nextActions)[number];

export const conversationActions = [
  "repeat_question",
  "explain_question",
  "accept_pursuit",
  "decline_pursuit",
  "accept_pursuit_threshold",
  "keep_pursuit_preference",
  "continue_pursuit",
] as const;

export type ActionType = (typeof conversationActions)[number];
export type ConversationAction = ActionType;

export const leadStatuses = [
  "qualified",
  "warm",
  "unqualified",
  "pending",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const conversationStatuses = [
  "active",
  "completed",
  "abandoned",
] as const;

export type ConversationStatus = (typeof conversationStatuses)[number];

export interface StartConversationRequest {
  name: string;
  email: string;
}

export interface ConversationResponse {
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
  ui_directives: UIDirective[];
}

export type ConversationStartResponse = ConversationResponse;

export type MetricValue = string | number | boolean;
export type MetricTextInteraction = {
  type: "metric_text";
  metric: string;
  message: string;
};
export type StructuredAnswerInteraction = {
  type: "structured_answer";
  metric: string;
  value: MetricValue;
};
export type ActionInteraction = {
  type: "action";
  action: ActionType;
  metric?: string;
};
export type AskKenzoInteraction = { type: "ask_kenzo"; message: string };
export type GeneralTextInteraction = { type: "general_text"; message: string };
export type Interaction =
  | MetricTextInteraction
  | StructuredAnswerInteraction
  | ActionInteraction
  | AskKenzoInteraction
  | GeneralTextInteraction;

export type QualificationOption = { label: string; value: MetricValue };
export type QualificationUI = {
  type: "single_select" | "boolean_choice" | "number_input" | "text_input";
  options: QualificationOption[];
  allow_custom: boolean;
};
export type MetricQuestionDirective = {
  type: "metric_question";
  metric: string;
  question: string;
  description?: string | null;
  examples: string[];
  ui: QualificationUI;
};
export type PursuitOfferDirective = {
  type: "pursuit_offer";
  metric: string;
  threshold: MetricValue | null;
  minimum_viable_threshold: MetricValue | null;
};
export type PursuitDecisionDirective = {
  type: "pursuit_decision";
  metric: string;
  proposed_value: MetricValue | null;
  threshold: MetricValue | null;
};
export type UIDirective = MetricQuestionDirective
  | PursuitOfferDirective
  | PursuitDecisionDirective
  | { [T in "focus_metric" | "metric_not_available_yet"]:
      { type: T; metric: string }
    }["focus_metric" | "metric_not_available_yet"]
  | { [T in "qualification_complete" | "show_booking_cta" | "hard_disqualification" | "conversation_end"]:
      { type: T }
    }["qualification_complete" | "show_booking_cta" | "hard_disqualification" | "conversation_end"];

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
  question?: MetricQuestionDirective;
  messages: ConversationUiMessage[];
  isExpanded: boolean;
  /** Last observed UI, never used to determine qualification or lead status. */
  pursuit?: PursuitOfferDirective | PursuitDecisionDirective;
}

export interface ConversationUiState {
  conversation: ConversationResponse;
  blocks: MetricConversationBlock[];
  terminalMessages: ConversationUiMessage[];
  askMessages: ConversationUiMessage[];
  generalMessages: ConversationUiMessage[];
  drafts: Record<string, string>;
  messagesClosed?: boolean;
}

export type StartConversationFieldErrors = Partial<
  Record<keyof StartConversationRequest, string>
>;

export interface StartConversationValidationResult {
  payload: StartConversationRequest | null;
  errors: StartConversationFieldErrors;
}
