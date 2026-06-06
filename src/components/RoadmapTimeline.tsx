"use client";

import { RoadmapStep } from "@/lib/types";

interface RoadmapTimelineProps {
  steps: RoadmapStep[];
}

function icon(step: RoadmapStep): string {
  if (step.type === "goal") return "🏁";
  if (step.status === "done") return "✓";
  if (step.status === "current") return "▶";
  return "□";
}

export function RoadmapTimeline({ steps }: RoadmapTimelineProps) {
  return (
    <div className="sketch-border bg-card p-4">
      {steps.map((step, index) => {
        const isGoal = step.type === "goal";
        const isReward = step.type === "reward";
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id}>
            <div
              className={`flex items-start gap-2 text-sm ${
                step.status === "current"
                  ? "font-bold text-primary"
                  : step.status === "done"
                    ? "text-muted line-through"
                    : isReward
                      ? "text-reward"
                      : isGoal
                        ? "font-bold"
                        : ""
              }`}
            >
              <span className="w-5 text-center shrink-0 text-xs pt-0.5">
                {icon(step)}
              </span>
              <span className="flex-1">{step.label}</span>
            </div>
            {!isLast && (
              <p className="text-muted text-xs ml-5 my-1">↓</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
