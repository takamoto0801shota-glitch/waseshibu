import { getBaselineRhythm, normalizeMode } from "./rhythmCoach";
import { DailyPlan, ScheduleBlock, UserProfile } from "./types";

export { normalizeMode } from "./rhythmCoach";

export function createDailyPlan(
  profile: UserProfile,
  todayMinutes: number
): DailyPlan {
  const mode = normalizeMode(profile.mode);
  return {
    mode,
    targetStudyMinutes: todayMinutes,
    rhythm: getBaselineRhythm(mode),
    log: [],
    studyDoneMinutes: 0,
    rewardDoneMinutes: 0,
    sessionCount: 0,
  };
}

export function getDaysUntilTest(testDate: string): number | null {
  if (!testDate) return null;
  const test = new Date(testDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  test.setHours(0, 0, 0, 0);
  const diff = Math.ceil((test.getTime() - today.getTime()) / 86400000);
  return diff > 0 ? diff : null;
}

/** 勉強＋自由時間の合計消化 */
export function getTotalDoneMinutes(plan: DailyPlan): number {
  return plan.studyDoneMinutes + plan.rewardDoneMinutes;
}

/** 設定時間に対する残り（勉強＋自由時間） */
export function getRemainingTotalMinutes(plan: DailyPlan): number {
  return Math.max(0, plan.targetStudyMinutes - getTotalDoneMinutes(plan));
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
  return Math.min(plan.targetStudyMinutes, minutes);
}

export function isPlanComplete(plan: DailyPlan): boolean {
  return getTotalDoneMinutes(plan) >= plan.targetStudyMinutes;
}
