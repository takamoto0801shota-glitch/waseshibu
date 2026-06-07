import { todayStrJST } from "./dateUtils";
import { normalizeMode, optimizeRhythmForBudget } from "./rhythmCoach";
import { DailyPlan, ScheduleBlock, UserProfile } from "./types";

export { normalizeMode } from "./rhythmCoach";

export function createDailyPlan(
  profile: UserProfile,
  studyMinutes: number,
  rewardMinutes: number
): DailyPlan {
  const mode = normalizeMode(profile.mode);
  return {
    mode,
    targetStudyMinutes: studyMinutes,
    targetRewardMinutes: rewardMinutes,
    rhythm: optimizeRhythmForBudget(mode, studyMinutes, rewardMinutes),
    log: [],
    studyDoneMinutes: 0,
    rewardDoneMinutes: 0,
    sessionCount: 0,
  };
}

export function normalizeDailyPlan(plan: DailyPlan): DailyPlan {
  const mode = normalizeMode(plan.mode);
  const targetRewardMinutes =
    plan.targetRewardMinutes ??
    Math.max(5, Math.round((plan.targetStudyMinutes ?? 120) / 3));
  const targetStudyMinutes = plan.targetStudyMinutes ?? 120;
  return {
    ...plan,
    mode,
    targetStudyMinutes,
    targetRewardMinutes,
    rhythm:
      plan.rhythm ??
      optimizeRhythmForBudget(mode, targetStudyMinutes, targetRewardMinutes),
  };
}

export function getDaysUntilTest(testDate: string): number | null {
  if (!testDate) return null;
  const today = todayStrJST();
  const todayMs = new Date(`${today}T12:00:00+09:00`).getTime();
  const testMs = new Date(`${testDate}T12:00:00+09:00`).getTime();
  const diff = Math.round((testMs - todayMs) / 86400000);
  return diff >= 0 ? diff : null;
}

/** 勉強＋自由時間の合計消化 */
export function getTotalDoneMinutes(plan: DailyPlan): number {
  return plan.studyDoneMinutes + plan.rewardDoneMinutes;
}

export function getRemainingStudyMinutes(plan: DailyPlan): number {
  return Math.max(0, plan.targetStudyMinutes - plan.studyDoneMinutes);
}

export function getRemainingRewardMinutes(plan: DailyPlan): number {
  return Math.max(0, plan.targetRewardMinutes - plan.rewardDoneMinutes);
}

/** 設定時間に対する残り（勉強＋自由時間） */
export function getRemainingTotalMinutes(plan: DailyPlan): number {
  return getRemainingStudyMinutes(plan) + getRemainingRewardMinutes(plan);
}

export function getTargetTotalMinutes(plan: DailyPlan): number {
  return plan.targetStudyMinutes + plan.targetRewardMinutes;
}

/** 現在ブロックの経過を含むリアルタイム消化 */
export function getLiveTotalMinutes(
  plan: DailyPlan,
  currentBlock: ScheduleBlock | null,
  remainingSeconds: number
): number {
  let minutes = getTotalDoneMinutes(plan);
  if (currentBlock) {
    const elapsed =
      currentBlock.durationMinutes * 60 - remainingSeconds;
    minutes += elapsed / 60;
  }
  return Math.min(getTargetTotalMinutes(plan), minutes);
}

export function isPlanComplete(plan: DailyPlan): boolean {
  return (
    getRemainingStudyMinutes(plan) <= 0 &&
    getRemainingRewardMinutes(plan) <= 0
  );
}
