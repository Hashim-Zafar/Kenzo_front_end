import {
  isConversationAction,
  isConversationResponse,
  isRecord,
} from "@/lib/helpers";
import type {
  ConversationAction,
  ConversationUiMessage,
  ConversationUiState,
  MessageDeliveryStatus,
  PendingConversationInteraction,
  SendConversationMessageRequest,
} from "@/types/types";

const conversationUiStorageVersion = 1;

export const conversationActionLabels: Record<ConversationAction, string> = {
  accept_pursuit: "Discuss this with Kenzo",
  decline_pursuit: "Keep my current preference",
  accept_pursuit_threshold: "Accept the preferred target",
  keep_pursuit_preference: "Keep my latest preference",
  continue_pursuit: "Continue discussing",
};

let fallbackMessageId = 0;

export function createConversationMessageId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  fallbackMessageId += 1;
  return `message-${Date.now()}-${fallbackMessageId}`;
}

export function formatMetricLabel(metric: string): string {
  return metric
    .split("_")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function getRemainingQuestionLabel(count: number): string {
  return count === 1 ? "1 question left" : `${count} questions left`;
}

export function getMetricSectionId(metric: string): string {
  const normalizedMetric = metric.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `metric-section-${normalizedMetric}`;
}

function createAssistantMessage(content: string): ConversationUiMessage {
  return {
    id: createConversationMessageId(),
    role: "assistant",
    content,
  };
}

export function createInitialConversationUiState(
  conversation: ConversationUiState["conversation"],
): ConversationUiState {
  const initialMessage = createAssistantMessage(conversation.response);

  if (conversation.current_metric === null) {
    return {
      conversation,
      blocks: [],
      terminalMessages: [initialMessage],
    };
  }

  return {
    conversation,
    blocks: [
      {
        metric: conversation.current_metric,
        messages: [initialMessage],
        isExpanded: true,
      },
    ],
    terminalMessages: [],
  };
}

export function setMetricExpanded(
  state: ConversationUiState,
  metric: string,
  isExpanded: boolean,
): ConversationUiState {
  return {
    ...state,
    blocks: state.blocks.map((block) =>
      block.metric === metric ? { ...block, isExpanded } : block,
    ),
  };
}

export function appendPendingInteraction(
  state: ConversationUiState,
  interaction: PendingConversationInteraction,
  displayContent: string,
): ConversationUiState {
  if (!interaction.owningMetric || !interaction.messageId) {
    return state;
  }

  const action = "message" in interaction.request
    ? undefined
    : interaction.request.action;
  const pendingMessage: ConversationUiMessage = {
    id: interaction.messageId,
    role: "user",
    content: displayContent,
    action,
    deliveryStatus: "sending",
  };

  return {
    ...state,
    blocks: state.blocks.map((block) =>
      block.metric === interaction.owningMetric
        ? {
            ...block,
            isExpanded: true,
            messages: [...block.messages, pendingMessage],
          }
        : block,
    ),
  };
}

export function updateMessageDelivery(
  state: ConversationUiState,
  messageId: string | null,
  deliveryStatus: MessageDeliveryStatus,
): ConversationUiState {
  if (!messageId) {
    return state;
  }

  return {
    ...state,
    blocks: state.blocks.map((block) => ({
      ...block,
      messages: block.messages.map((message) =>
        message.id === messageId ? { ...message, deliveryStatus } : message,
      ),
    })),
  };
}

export function applyConversationResponse(
  state: ConversationUiState,
  response: ConversationUiState["conversation"],
  pendingMessageId: string | null,
): ConversationUiState {
  const stateWithDeliveredMessage = updateMessageDelivery(
    state,
    pendingMessageId,
    "sent",
  );
  const assistantMessage = createAssistantMessage(response.response);

  if (response.current_metric === null) {
    return {
      ...stateWithDeliveredMessage,
      conversation: response,
      terminalMessages: [
        ...stateWithDeliveredMessage.terminalMessages,
        assistantMessage,
      ],
    };
  }

  const existingBlockIndex = stateWithDeliveredMessage.blocks.findIndex(
    (block) => block.metric === response.current_metric,
  );

  if (existingBlockIndex === -1) {
    return {
      ...stateWithDeliveredMessage,
      conversation: response,
      blocks: [
        ...stateWithDeliveredMessage.blocks.map((block) => ({
          ...block,
          isExpanded: false,
        })),
        {
          metric: response.current_metric,
          messages: [assistantMessage],
          isExpanded: true,
        },
      ],
    };
  }

  return {
    ...stateWithDeliveredMessage,
    conversation: response,
    blocks: stateWithDeliveredMessage.blocks.map((block, index) =>
      index === existingBlockIndex
        ? {
            ...block,
            isExpanded: true,
            messages: [...block.messages, assistantMessage],
          }
        : { ...block, isExpanded: false },
    ),
  };
}

function getConversationUiStorageKey(conversationId: string): string {
  return `bookingfunnel.conversation-ui:${conversationId}`;
}

export function persistConversationUiState(
  state: ConversationUiState,
  storage: Storage,
): void {
  storage.setItem(
    getConversationUiStorageKey(state.conversation.conversation_id),
    JSON.stringify({
      version: conversationUiStorageVersion,
      state,
    }),
  );
}

function isDeliveryStatus(value: unknown): value is MessageDeliveryStatus {
  return value === "sending" || value === "sent" || value === "failed";
}

function isUiMessage(value: unknown): value is ConversationUiMessage {
  if (!isRecord(value)) {
    return false;
  }

  const actionIsValid = value.action === undefined || isConversationAction(value.action);
  const deliveryStatusIsValid =
    value.deliveryStatus === undefined || isDeliveryStatus(value.deliveryStatus);

  return (
    typeof value.id === "string" &&
    (value.role === "assistant" || value.role === "user") &&
    typeof value.content === "string" &&
    actionIsValid &&
    deliveryStatusIsValid
  );
}

function isConversationUiState(value: unknown): value is ConversationUiState {
  if (!isRecord(value) || !isConversationResponse(value.conversation)) {
    return false;
  }

  if (!Array.isArray(value.blocks) || !Array.isArray(value.terminalMessages)) {
    return false;
  }

  const blocksAreValid = value.blocks.every((block) => {
    if (!isRecord(block) || !Array.isArray(block.messages)) {
      return false;
    }

    return (
      typeof block.metric === "string" &&
      block.metric.length > 0 &&
      typeof block.isExpanded === "boolean" &&
      block.messages.every(isUiMessage)
    );
  });

  return blocksAreValid && value.terminalMessages.every(isUiMessage);
}

export function loadConversationUiState(
  conversationId: string,
  storage: Storage,
): ConversationUiState | null {
  const serializedState = storage.getItem(
    getConversationUiStorageKey(conversationId),
  );

  if (!serializedState) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(serializedState);

    if (
      !isRecord(parsedValue) ||
      parsedValue.version !== conversationUiStorageVersion ||
      !isConversationUiState(parsedValue.state) ||
      parsedValue.state.conversation.conversation_id !== conversationId
    ) {
      return null;
    }

    return parsedValue.state;
  } catch {
    return null;
  }
}

export function getRequestDisplayContent(
  request: SendConversationMessageRequest,
): string {
  return isConversationAction(request.action)
    ? conversationActionLabels[request.action]
    : request.message ?? "";
}
