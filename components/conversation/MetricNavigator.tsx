import { formatMetricLabel, getMetricSectionId } from "@/lib/conversation";
import type { MetricConversationBlock } from "@/types/types";

interface MetricNavigatorProps {
  blocks: MetricConversationBlock[];
  activeMetric: string | null;
  onSelectMetric: (metric: string) => void;
}

function getLastUserResponse(block: MetricConversationBlock): string | null {
  return [...block.messages].reverse().find((message) => message.role === "user")?.content ?? null;
}

export function MetricNavigator({
  blocks,
  activeMetric,
  onSelectMetric,
}: MetricNavigatorProps) {
  return (
    <aside className="hidden min-h-0 flex-col rounded-2xl border border-outline-variant/45 bg-surface-container-lowest/75 p-4 shadow-sm backdrop-blur-sm lg:flex">
      <h2 className="px-2 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
        Qualification sections
      </h2>
      <nav className="mt-4 flex min-h-0 flex-col gap-1.5 overflow-y-auto" aria-label="Qualification sections">
        {blocks.map((block) => {
          const isActive = block.metric === activeMetric;
          const latestResponse = getLastUserResponse(block);

          return (
            <button
              key={block.metric}
              type="button"
              onClick={() => onSelectMetric(block.metric)}
              aria-controls={getMetricSectionId(block.metric)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isActive
                  ? "border-primary/25 bg-surface-container text-primary"
                  : "border-transparent text-on-surface hover:border-outline-variant/45 hover:bg-surface-container-low"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  isActive
                    ? "border-2 border-primary"
                    : "bg-primary-fixed/60 text-on-primary-fixed-variant"
                }`}
                aria-hidden="true"
              >
                {isActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                ) : (
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {formatMetricLabel(block.metric)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                  {isActive ? "Current section" : latestResponse ?? "Earlier section"}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
