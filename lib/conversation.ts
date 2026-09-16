import { interpretDirectives } from "@/lib/ui-directives";
import { isConversationResponse, isRecord, isUIDirective } from "@/lib/helpers";
import type { ConversationAction, ConversationUiMessage, ConversationUiState, Interaction } from "@/types/types";

const storageVersion = 7;
export const conversationActionLabels: Record<ConversationAction, string> = {
  repeat_question: "Repeat question",
  explain_question: "Explain question",
  accept_pursuit: "I'm open to discussing it",
  decline_pursuit: "Prefer to continue as-is",
  accept_pursuit_threshold: "Accept the proposed value",
  keep_pursuit_preference: "Keep my current preference",
  continue_pursuit: "Continue discussing",
};

export function createConversationMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}-${Math.random()}`;
}
export function formatMetricLabel(metric: string): string {
  return metric.replace(/[_-]+/g, " ").replace(/\b\w/g, word => word.toUpperCase());
}
export function getRemainingQuestionLabel(count: number): string {
  return `${count} question${count === 1 ? "" : "s"} remaining`;
}
export function getMetricSectionId(metric: string): string {
  return `metric-${encodeURIComponent(metric)}`;
}
export function getRequestDisplayContent(request: Interaction): string {
  if (request.type === "action") return conversationActionLabels[request.action];
  if (request.type === "structured_answer") return typeof request.value === "boolean"
    ? request.value ? "Yes" : "No" : String(request.value);
  return request.message;
}
export function draftKey(request: Interaction): string | null {
  if (request.type === "metric_text" || request.type === "structured_answer") return `metric:${request.metric}`;
  if (request.type === "ask_kenzo" || request.type === "general_text") return request.type;
  return null;
}

export function createInitialConversationUiState(conversation: ConversationUiState["conversation"]): ConversationUiState {
  return applyConversationResponse({
    conversation, blocks: [], terminalMessages: [], askMessages: [], generalMessages: [], drafts: {},
  }, conversation);
}
export function setMetricExpanded(state: ConversationUiState, metric: string, isExpanded: boolean): ConversationUiState {
  return { ...state, blocks: state.blocks.map(block => block.metric === metric ? { ...block, isExpanded } : block) };
}

/** Apply one acknowledged interaction atomically. Local history records submissions, not accepted answers. */
export function applyConversationResponse(
  state: ConversationUiState,
  response: ConversationUiState["conversation"],
  interaction?: Interaction,
): ConversationUiState {
  const conversation = response;
  const view = interpretDirectives(conversation);
  const blocks = state.blocks.map(block => ({ ...block, messages: [...block.messages] }));
  const next: ConversationUiState = {
    ...state, conversation, blocks, drafts: { ...state.drafts },
    askMessages: [...state.askMessages], generalMessages: [...state.generalMessages],
    terminalMessages: [...state.terminalMessages],
  };
  // Only actual questions, pursuits and current_metric establish observed blocks.
  // focus/not-available directives never create a hypothetical metric.
  const observe = (metric: string) => {
    let block = blocks.find(item => item.metric === metric);
    if (!block) {
      block = { metric, messages: [], isExpanded: false };
      blocks.push(block);
    }
    return block;
  };
  if (view.activeMetric) observe(view.activeMetric);
  if (interaction) {
    const source = "metric" in interaction && interaction.metric
      ? blocks.find(block => block.metric === interaction.metric)?.messages
      : interaction.type === "ask_kenzo" ? next.askMessages : next.generalMessages;
    (source ?? next.generalMessages).push({
      id: createConversationMessageId(), role: "user", content: getRequestDisplayContent(interaction),
      deliveryStatus: "sent", ...(interaction.type === "action" ? { action: interaction.action } : {}),
    });
    const key = draftKey(interaction);
    if (key) next.drafts[key] = "";
    if (interaction.type === "structured_answer") next.drafts[`number:${interaction.metric}`] = "";
  }
  // Only the latest qualification response supplies actionable pursuit controls.
  // A separate Ask Kenzo exchange does not dismiss the current qualification UI.
  if (interaction?.type !== "ask_kenzo") {
    for (const block of blocks) block.pursuit = undefined;
  }
  for (const directive of conversation.ui_directives) {
    switch (directive.type) {
      case "metric_question":
        observe(directive.metric).question = directive;
        observe(directive.metric).pursuit = undefined;
        break;
      case "pursuit_offer":
      case "pursuit_decision":
        observe(directive.metric).pursuit = directive;
        break;
    }
  }
  for (const block of blocks) {
    if (view.terminal || block.metric !== view.activeMetric) block.pursuit = undefined;
    // Keep the real current question visible even while focusing another observed metric.
    if (block.metric === view.activeMetric || block.metric === view.focusMetric) block.isExpanded = true;
    else if (state.conversation.current_metric !== view.activeMetric) block.isExpanded = false;
  }

  if (response.response) {
    const assistant: ConversationUiMessage = { id: createConversationMessageId(), role: "assistant", content: response.response };
    let destination = next.generalMessages;
    if (view.terminal) destination = next.terminalMessages;
    else if (interaction?.type === "ask_kenzo") destination = next.askMessages;
    else if (interaction?.type === "general_text") destination = next.generalMessages;
    else {
      const unavailable = conversation.ui_directives.some(d => d.type === "metric_not_available_yet");
      const missingFocus = view.focusMetric && !blocks.some(block => block.metric === view.focusMetric);
      if (!unavailable && !missingFocus) {
        const target = view.focusMetric ?? (interaction && "metric" in interaction ? interaction.metric : null);
        destination = blocks.find(block => block.metric === target)?.messages ?? next.generalMessages;
      }
    }
    destination.push(assistant);
  }
  return next;
}

// Session-only cache, scoped to tenant and API. No server hydration endpoint exists.
const memory = new Map<string, ConversationUiState>();
function storageKey(conversationId: string) {
  return `kenzo.v4:${process.env.NEXT_PUBLIC_API_BASE_URL}:${process.env.NEXT_PUBLIC_API_AGENCY_ID}:${process.env.NEXT_PUBLIC_API_SCHEMA_NAME}:${conversationId}`;
}
export function persistConversationUiState(state: ConversationUiState, storage?: Storage): boolean {
  if (!state.conversation.conversation_id) return false;
  const key = storageKey(state.conversation.conversation_id);
  memory.set(key, state);
  try {
    (storage ?? window.sessionStorage).setItem(key, JSON.stringify({ version: storageVersion, state }));
    return true;
  } catch { return false; }
}
function isMessage(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.content === "string" &&
    (value.role === "user" || value.role === "assistant");
}
function isSession(value: unknown): value is ConversationUiState {
  return isRecord(value) && isConversationResponse(value.conversation) &&
    Array.isArray(value.blocks) && value.blocks.every(block => isRecord(block) &&
      typeof block.metric === "string" && typeof block.isExpanded === "boolean" &&
      (block.question === undefined || (isRecord(block.question) && block.question.type === "metric_question" && isUIDirective(block.question))) &&
      (block.pursuit === undefined || (isRecord(block.pursuit) && block.pursuit.metric === block.metric &&
        (block.pursuit.type === "pursuit_offer" || block.pursuit.type === "pursuit_decision") && isUIDirective(block.pursuit))) &&
      Array.isArray(block.messages) && block.messages.every(isMessage)) &&
    [value.askMessages, value.generalMessages, value.terminalMessages].every(messages => Array.isArray(messages) && messages.every(isMessage)) &&
    isRecord(value.drafts) && Object.values(value.drafts).every(draft => typeof draft === "string") &&
    (value.messagesClosed === undefined || typeof value.messagesClosed === "boolean");
}
export function loadConversationUiState(conversationId: string, storage?: Storage): ConversationUiState | null {
  const key = storageKey(conversationId);
  try {
    const raw = (storage ?? window.sessionStorage).getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (isRecord(value) && value.version === storageVersion && isSession(value.state) &&
      value.state.conversation.conversation_id === conversationId) return value.state;
  } catch { /* Browser storage can be unavailable; retain this tab's in-memory session. */ }
  return memory.get(key) ?? null;
}
