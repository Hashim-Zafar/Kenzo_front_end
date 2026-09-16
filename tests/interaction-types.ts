import type { Interaction } from "../types/types";

// These intentionally invalid requests must remain compile errors.
const invalidText: Interaction = {
  type: "metric_text",
  metric: "budget",
  // @ts-expect-error metric_text requires message, not value
  value: 12000,
};
const invalidAnswer: Interaction = {
  type: "structured_answer",
  metric: "decision_maker",
  // @ts-expect-error structured_answer requires value, not message
  message: "yes",
};
const invalidWrapper: Interaction = {
  // @ts-expect-error V4 has no wrapped interaction request
  interaction: { type: "general_text", message: "hello" },
};
void [invalidText, invalidAnswer, invalidWrapper];
