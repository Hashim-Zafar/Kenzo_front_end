import type {
  ActionInteraction,
  AskKenzoInteraction,
  ConversationAction,
  GeneralTextInteraction,
  MetricTextInteraction,
  MetricValue,
  StructuredAnswerInteraction,
} from "@/types/types";

export const interactions = {
  metricText: (metric: string, message: string): MetricTextInteraction => ({
    type: "metric_text",
    metric,
    message,
  }),
  structuredAnswer: (
    metric: string,
    value: MetricValue,
  ): StructuredAnswerInteraction => ({
    type: "structured_answer",
    metric,
    value,
  }),
  action: (action: ConversationAction, metric?: string): ActionInteraction => ({
    type: "action",
    action,
    ...(metric ? { metric } : {}),
  }),
  askKenzo: (message: string): AskKenzoInteraction => ({
    type: "ask_kenzo",
    message,
  }),
  generalText: (message: string): GeneralTextInteraction => ({
    type: "general_text",
    message,
  }),
};
