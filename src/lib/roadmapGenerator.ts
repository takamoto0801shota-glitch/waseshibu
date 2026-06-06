import { getRemainingTotalMinutes, getTotalDoneMinutes } from "./planGenerator";
import {
  computeNextStudyMinutes,
  computeRewardMinutes,
  pickNextSubject,
} from "./rhythmCoach";
import {
  DailyPlan,
  RoadmapStep,
  ScheduleBlock,
  SessionPhase,
  UserProfile,
} from "./types";

const MAX_PROJECTED = 24;

function studyLabel(subjectName: string, minutes: number): string {
  return `${subjectName}${minutes}分`;
}

function rewardLabel(minutes: number): string {
  return minutes > 0 ? `フリータイム${minutes}分` : "フリータイム";
}

function simplifyLogLabel(label: string, type: "study" | "reward"): string {
  if (type === "reward") {
    const m = label.match(/(\d+)分/);
    return m ? `フリータイム${m[1]}分` : "フリータイム";
  }
  return label.replace(/（[^）]+）$/, "").replace(/\s+/g, "");
}

export function buildRoadmap(
  profile: UserProfile,
  plan: DailyPlan,
  options: {
    todaySubjectIds: string[];
    currentBlock?: ScheduleBlock | null;
    sessionPhase?: SessionPhase | null;
  }
): RoadmapStep[] {
  const steps: RoadmapStep[] = [];
  const activeIds = plan.todaySubjectIds ?? options.todaySubjectIds;

  for (const entry of plan.log) {
    steps.push({
      id: entry.id,
      type: entry.type,
      label: simplifyLogLabel(entry.label, entry.type),
      status: "done",
      minutes: entry.durationMinutes,
    });
  }

  let rem = getRemainingTotalMinutes(plan);
  let sessionIndex = plan.sessionCount;
  const rhythm = plan.rhythm;

  const { currentBlock, sessionPhase } = options;

  let projected = 0;
  let markFirstUpcoming =
    !steps.some((s) => s.status === "current") &&
    steps.every((s) => s.status === "done");

  if (sessionPhase === "mood_check") {
    steps.push({
      id: "current-mood",
      type: "checkpoint",
      label: "調子チェック",
      status: "current",
    });
    markFirstUpcoming = false;

    const rewardMins = computeRewardMinutes(rhythm, rem);
    if (rewardMins > 0) {
      steps.push({
        id: `proj-reward-${sessionIndex}`,
        type: "reward",
        label: rewardLabel(rewardMins),
        status: "upcoming",
        minutes: rewardMins,
      });
      rem -= rewardMins;
      sessionIndex++;
      projected++;
    }
  } else if (currentBlock) {
    steps.push({
      id: currentBlock.id,
      type: currentBlock.type,
      label: simplifyLogLabel(
        currentBlock.label,
        currentBlock.type
      ),
      status: "current",
      minutes: currentBlock.durationMinutes,
    });
    rem = Math.max(0, rem - currentBlock.durationMinutes);
    if (currentBlock.type === "reward") {
      sessionIndex += 1;
    }
  }

  while (rem > 0 && projected < MAX_PROJECTED) {
    const { minutes, isReview } = computeNextStudyMinutes(rhythm, rem);
    if (minutes <= 0) break;

    const subject = isReview
      ? pickNextSubject(profile, 0, activeIds)
      : pickNextSubject(profile, sessionIndex, activeIds);
    const status = markFirstUpcoming ? "current" : "upcoming";
    steps.push({
      id: `proj-study-${sessionIndex}-${projected}`,
      type: "study",
      label: isReview
        ? `${subject.name}${minutes}分（復習）`
        : studyLabel(subject.name, minutes),
      status,
      minutes,
    });
    if (markFirstUpcoming) markFirstUpcoming = false;
    rem -= minutes;
    projected++;
    if (rem <= 0) break;

    const rewardMins = computeRewardMinutes(rhythm, rem);
    if (rewardMins <= 0) break;

    steps.push({
      id: `proj-reward-${sessionIndex}`,
      type: "reward",
      label: rewardLabel(rewardMins),
      status: "upcoming",
      minutes: rewardMins,
    });
    rem -= rewardMins;
    sessionIndex++;
    projected++;
  }

  if (getTotalDoneMinutes(plan) >= plan.targetStudyMinutes || rem <= 0) {
    steps.push({
      id: "goal",
      type: "goal",
      label: "完了",
      status: steps.some((s) => s.status === "current") ? "upcoming" : "current",
    });
  } else {
    steps.push({
      id: "goal",
      type: "goal",
      label: "完了",
      status: "upcoming",
    });
  }

  // 未開始かつ current なし → 最初の upcoming を current に
  if (
    !currentBlock &&
    sessionPhase !== "mood_check" &&
    steps.length > 0 &&
    !steps.some((s) => s.status === "current")
  ) {
    const first = steps.find((s) => s.status === "upcoming" && s.type !== "goal");
    if (first) first.status = "current";
  }

  return steps;
}

export function countStepsUntilGoal(steps: RoadmapStep[]): number {
  return steps.filter(
    (s) => s.status !== "done" && s.type !== "goal"
  ).length;
}

export function getNextRewardHint(steps: RoadmapStep[]): string | null {
  const currentIdx = steps.findIndex((s) => s.status === "current");
  const searchFrom = currentIdx >= 0 ? currentIdx + 1 : 0;
  for (let i = searchFrom; i < steps.length; i++) {
    if (steps[i].type === "reward" && steps[i].status !== "done") {
      return steps[i].label;
    }
  }
  return null;
}
