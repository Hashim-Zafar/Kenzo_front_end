import type { ConversationResponse } from "@/types/types";

/** One projection of the latest server state. No prose parsing or local scoring. */
export function interpretDirectives(response: ConversationResponse) {
  const activeMetric = response.current_metric;
  let focusMetric = activeMetric;
  const unavailableMetrics = new Set<string>();
  let booking = response.next_action === "show_booking_cta";
  let ended = response.conversation_status === "abandoned" || response.next_action === "end_chat";
  for (const directive of response.ui_directives) {
    switch (directive.type) {
      case "focus_metric":
        focusMetric = directive.metric;
        break;
      case "metric_not_available_yet":
        if (directive.metric !== activeMetric) unavailableMetrics.add(directive.metric);
        break;
      case "show_booking_cta":
        booking = true;
        break;
      case "conversation_end":
        ended = true;
        break;
      case "metric_question":
      case "pursuit_offer":
      case "pursuit_decision":
        // Dispatched into metric blocks by applyConversationResponse.
        break;
      case "hard_disqualification":
      case "qualification_complete":
        // Status/qualification fields govern completion; a notice alone does not.
        break;
      default: {
        const exhaustive: never = directive;
        return exhaustive;
      }
    }
  }
  if (focusMetric && unavailableMetrics.has(focusMetric)) focusMetric = activeMetric;
  const disqualified = response.conversation_status === "completed" && response.lead_status === "unqualified";
  const successful = response.conversation_status === "completed" && response.qualification_complete &&
    (response.lead_status === "qualified" || response.lead_status === "warm");
  const showBooking = response.can_proceed && (booking || successful) && !ended &&
    response.lead_status !== "unqualified";
  const terminal = response.conversation_status !== "active" || ended ||
    response.qualification_complete || showBooking;
  return {
    activeMetric, focusMetric, unavailableMetrics, ended, disqualified, showBooking, terminal,
    acceptsInput: !terminal,
  };
}

export function canInteractWithMetric(response: ConversationResponse, metric: string) {
  const view = interpretDirectives(response);
  return view.acceptsInput && !view.unavailableMetrics.has(metric) &&
    (metric === view.activeMetric || metric === view.focusMetric);
}
