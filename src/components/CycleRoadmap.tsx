"use client";

import { StudyCycle } from "@/lib/types";

interface CycleRoadmapProps {
  cycles: StudyCycle[];
  completedThrough?: number;
}

export function CycleRoadmap({
  cycles,
  completedThrough = -1,
}: CycleRoadmapProps) {
  return (
    <div className="sketch-border bg-card p-4 space-y-4">
      {cycles.map((cycle, index) => {
        const studyDone = completedThrough >= index * 2;
        const rewardDone = completedThrough >= index * 2 + 1;
        return (
          <div key={cycle.id} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-4 text-center text-xs ${
                  studyDone ? "text-primary" : "text-muted"
                }`}
              >
                {studyDone ? "✓" : "□"}
              </span>
              <span className={studyDone ? "text-muted line-through" : ""}>
                {cycle.studyLabel}
              </span>
            </div>
            {cycle.rewardMinutes > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-4 text-center text-xs ${
                    rewardDone ? "text-reward" : "text-muted"
                  }`}
                >
                  {rewardDone ? "✓" : "□"}
                </span>
                <span
                  className={
                    rewardDone
                      ? "text-muted line-through"
                      : "text-reward font-medium"
                  }
                >
                  {cycle.rewardLabel}
                </span>
              </div>
            )}
            {index < cycles.length - 1 && (
              <div className="border-b border-border/40 pt-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}
