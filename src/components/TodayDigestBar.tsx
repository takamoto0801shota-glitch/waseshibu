"use client";

import {
  getLiveRewardMinutes,
  getLiveStudyMinutes,
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
  const liveStudy = getLiveStudyMinutes(
    plan,
    currentBlock,
    remainingSeconds
  );
  const liveReward = getLiveRewardMinutes(
    plan,
    currentBlock,
    remainingSeconds
  );
  const studyPercent = Math.min(
    100,
    (liveStudy / plan.targetStudyMinutes) * 100
  );
  const rewardPercent = Math.min(
    100,
    (liveReward / plan.targetRewardMinutes) * 100
  );

  return (
    <div className="w-full px-5 pt-6 pb-3">
      <div className="max-w-md mx-auto sketch-border bg-card px-4 py-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">勉強</span>
          <span className="font-bold tabular-nums">
            {Math.round(liveStudy)}/{plan.targetStudyMinutes}分
          </span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden border border-border mb-3">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${studyPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">自由</span>
          <span className="font-bold tabular-nums text-reward">
            {Math.round(liveReward)}/{plan.targetRewardMinutes}分
          </span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-reward rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${rewardPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
