"use client";

import {
  getTargetTotalMinutes,
  getTotalDoneMinutes,
} from "@/lib/planGenerator";
import { rhythmHint } from "@/lib/rhythmCoach";
import { DailyPlan } from "@/lib/types";

interface SessionLogProps {
  plan: DailyPlan;
}

export function SessionLog({ plan }: SessionLogProps) {
  const done = getTotalDoneMinutes(plan);
  const target = getTargetTotalMinutes(plan);
  const progress = Math.min(100, Math.round((done / target) * 100));

  return (
    <div className="space-y-4">
      <div className="sketch-border bg-card p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">今日の消化</span>
          <span className="font-bold">
            {done}/{target}分
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
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted mt-3">
          現在のリズム: {rhythmHint(plan.rhythm)}
        </p>
        {plan.coachMessage && (
          <p className="text-xs text-primary mt-1">{plan.coachMessage}</p>
        )}
      </div>

      {plan.log.length > 0 && (
        <div className="sketch-border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-muted mb-2">これまで</p>
          {plan.log.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 text-sm ${
                entry.type === "reward" ? "text-reward" : ""
              }`}
            >
              <span className="text-primary text-xs">✓</span>
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
