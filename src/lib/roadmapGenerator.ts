import {
  getRemainingRewardMinutes,
  getRemainingStudyMinutes,
  isPlanComplete,
  normalizeDailyPlan,
} from "./planGenerator";
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
  const normalized = normalizeDailyPlan(plan);
  const steps: RoadmapStep[] = [];
  const activeIds = normalized.todaySubjectIds ?? options.todaySubjectIds;

  for (const entry of normalized.log) {
    steps.push({
      id: entry.id,
      type: entry.type,
      label: simplifyLogLabel(entry.label, entry.type),
      status: "done",
      minutes: entry.durationMinutes,
    });
  }

  let remStudy = getRemainingStudyMinutes(normalized);
  let remReward = getRemainingRewardMinutes(normalized);
  let sessionIndex = normalized.sessionCount;
  const rhythm = normalized.rhythm;

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

    const rewardMins = computeRewardMinutes(rhythm, remReward);
    if (rewardMins > 0) {
      steps.push({
        id: `proj-reward-${sessionIndex}`,
        type: "reward",
        label: rewardLabel(rewardMins),
        status: "upcoming",
        minutes: rewardMins,
      });
      remReward -= rewardMins;
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
    if (currentBlock.type === "study") {
      remStudy = Math.max(0, remStudy - currentBlock.durationMinutes);
    } else {
      remReward = Math.max(0, remReward - currentBlock.durationMinutes);
      sessionIndex += 1;
    }
  }

  while (
    (remStudy > 0 || remReward > 0) &&
    projected < MAX_PROJECTED
  ) {
    if (remStudy > 0) {
      const { minutes, isReview } = computeNextStudyMinutes(
        rhythm,
        remStudy
      );
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
      remStudy -= minutes;
      projected++;
    } else {
      break;
    }

    if (remReward <= 0) continue;

    const rewardMins = computeRewardMinutes(rhythm, remReward);
    if (rewardMins <= 0) break;

    steps.push({
      id: `proj-reward-${sessionIndex}`,
      type: "reward",
      label: rewardLabel(rewardMins),
      status: "upcoming",
      minutes: rewardMins,
    });
    remReward -= rewardMins;
    sessionIndex++;
    projected++;
  }

  if (isPlanComplete(normalized) || (remStudy <= 0 && remReward <= 0)) {
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
