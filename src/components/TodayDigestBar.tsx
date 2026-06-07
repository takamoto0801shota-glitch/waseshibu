"use client";

import {
  getLiveTotalMinutes,
  getTargetTotalMinutes,
} from "@/lib/planGenerator";
import { DailyPlan, ScheduleBlock } from "@/lib/types";

interface TodayDigestBarProps {
  plan: DailyPlan;
  currentBlock?: ScheduleBlock | null;
  remainingSeconds?: number;
}

export function TodayDigestBar({
  plan,
  currentBlock = null,
  remainingSeconds = 0,
}: TodayDigestBarProps) {
  const liveMinutes = getLiveTotalMinutes(
    plan,
    currentBlock,
    remainingSeconds
  );
  const targetTotal = getTargetTotalMinutes(plan);
  const percent = Math.min(100, (liveMinutes / targetTotal) * 100);

  return (
    <div className="w-full px-5 pt-6 pb-3">
      <div className="max-w-md mx-auto sketch-border bg-card px-4 py-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">今日の消化</span>
          <span className="font-bold tabular-nums">
            {Math.round(liveMinutes)}/{targetTotal}分
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted mb-2">
          <span>
            勉強 {plan.studyDoneMinutes}/{plan.targetStudyMinutes}分
          </span>
          <span>
            自由 {plan.rewardDoneMinutes}/{plan.targetRewardMinutes}分
          </span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
