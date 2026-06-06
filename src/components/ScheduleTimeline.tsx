"use client";

import { ScheduleBlock } from "@/lib/types";

interface ScheduleTimelineProps {
  blocks: ScheduleBlock[];
}

const typeStyle: Record<string, string> = {
  free: "text-muted",
  study: "text-text font-medium",
  review: "text-primary font-medium",
};

export function ScheduleTimeline({ blocks }: ScheduleTimelineProps) {
  return (
    <div className="sketch-border bg-card p-4">
      <div className="space-y-1">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`flex items-baseline gap-3 py-1.5 text-sm border-b border-border/50 last:border-0 ${typeStyle[block.type]}`}
          >
            <span className="tabular-nums text-muted shrink-0 w-[72px] text-xs">
              {block.startMinute}〜{block.endMinute}
            </span>
            <span>{block.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
