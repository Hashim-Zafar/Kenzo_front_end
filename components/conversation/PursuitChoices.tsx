import { conversationActionLabels } from "@/lib/conversation";
import type { ConversationAction, MetricConversationBlock, MetricValue } from "@/types/types";

function displayValue(value: MetricValue | null): string | null {
  if (value === null) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "number" ? new Intl.NumberFormat("en", { maximumFractionDigits: 20 }).format(value) : value;
}

export function PursuitChoices({ pursuit, disabled, onAction }: {
  pursuit: NonNullable<MetricConversationBlock["pursuit"]>;
  disabled: boolean;
  onAction: (action: ConversationAction, metric: string) => void;
}) {
  const actions: ConversationAction[] = pursuit.type === "pursuit_offer"
    ? ["accept_pursuit", "decline_pursuit"]
    : ["accept_pursuit_threshold", "keep_pursuit_preference", "continue_pursuit"];
  const proposed = pursuit.type === "pursuit_decision" ? displayValue(pursuit.proposed_value) : null;
  return (
    <div className="space-y-3 rounded-xl bg-surface-container-low p-4" aria-label={pursuit.type === "pursuit_offer" ? "Optional discussion" : "Your preference"}>
      <p className="text-xs font-semibold text-primary">{pursuit.type === "pursuit_offer" ? "How would you like to continue?" : "The choice is yours"}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {actions.map((action, index) => (
          <button key={action} type="button" disabled={disabled} onClick={() => onAction(action, pursuit.metric)}
            className={`min-h-11 rounded-[0.625rem] px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${index === 0 ? "bg-primary-container text-on-primary hover:bg-primary" : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container"}`}>
            {action === "accept_pursuit_threshold" && proposed ? `Use ${proposed}` : conversationActionLabels[action]}
          </button>
        ))}
      </div>
    </div>
  );
}
