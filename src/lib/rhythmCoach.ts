import { filterUnits } from "./exclusions";
import {
  DailyPlan,
  MODE_BASELINE,
  MODE_CYCLE,
  MoodCheck,
  RhythmState,
  StudyMode,
  ScheduleBlock,
  SessionLogEntry,
  SubjectConfig,
  UserDesire,
  UserProfile,
} from "./types";

const TASK_SUFFIX: Record<string, string[]> = {
  数学: ["演習", "基礎", "応用"],
  英語: ["文法・単語", "リスニング", "読解"],
  国語: ["読解", "漢字", "作文"],
  古文: ["読み返し", "文法", "暗記"],
  理科: ["演習", "暗記", "実験復習"],
  社会: ["暗記", "地図", "まとめ"],
};

const REVIEW_TASKS = ["復習", "総復習", "確認", "間違えたところ"];

const LEGACY_MODE_MAP: Record<string, StudyMode> = {
  normal: "self_study",
  pre_test: "top_grade",
  intensive: "serious",
  certification: "serious",
  review: "light",
};

export function normalizeMode(mode: string): StudyMode {
  if (mode in MODE_CYCLE) return mode as StudyMode;
  return LEGACY_MODE_MAP[mode] ?? "self_study";
}

const STUDY_MIN = 15;
const STUDY_MAX = 90;
const REWARD_MIN = 5;
const REWARD_MAX = 30;

export function getBaselineRhythm(mode: StudyMode): RhythmState {
  const base = MODE_BASELINE[mode];
  return {
    studyMinutes: base.studyMinutes,
    rewardMinutes: base.rewardMinutes,
    consecutiveTough: 0,
  };
}

export function adjustRhythm(
  rhythm: RhythmState,
  mood: MoodCheck
): RhythmState {
  if (mood === "great") {
    return {
      studyMinutes: Math.min(STUDY_MAX, rhythm.studyMinutes + 15),
      rewardMinutes: rhythm.rewardMinutes,
      consecutiveTough: 0,
    };
  }

  if (mood === "normal") {
    return { ...rhythm, consecutiveTough: 0 };
  }

  const nextTough = rhythm.consecutiveTough + 1;
  const shortened = Math.max(STUDY_MIN, rhythm.studyMinutes - 15);
  const extraReward = nextTough >= 2 ? 10 : 0;

  return {
    studyMinutes: shortened,
    rewardMinutes: Math.min(REWARD_MAX, rhythm.rewardMinutes + extraReward),
    consecutiveTough: nextTough,
  };
}

export function pickTask(subjectName: string, units: string[]): string {
  const allowed = filterUnits(units);
  if (allowed.length > 0) {
    return allowed[Math.floor(Math.random() * allowed.length)];
  }
  const suffixes = TASK_SUFFIX[subjectName] ?? ["学習"];
  return suffixes[Math.floor(Math.random() * suffixes.length)];
}

export function sortSubjects(subjects: SubjectConfig[]): SubjectConfig[] {
  return [...subjects];
}

export function pickNextSubject(
  profile: UserProfile,
  sessionCount: number,
  activeSubjectIds?: string[]
): SubjectConfig {
  let subjects = sortSubjects(profile.subjects);
  if (activeSubjectIds && activeSubjectIds.length > 0) {
    const allowed = new Set(activeSubjectIds);
    subjects = subjects.filter((s) => allowed.has(s.id));
  }
  if (subjects.length === 0) {
    return {
      id: "fallback",
      name: "学習",
      units: [],
      strength: "normal",
    };
  }
  return subjects[sessionCount % subjects.length];
}

export function computeRewardMinutes(
  rhythm: RhythmState,
  remainingTotal: number
): number {
  if (remainingTotal <= 0) return 0;
  return Math.min(rhythm.rewardMinutes, remainingTotal);
}

export function peekNextSubjectName(
  profile: UserProfile,
  plan: DailyPlan,
  todaySubjectIds: string[],
  pendingRewardMinutes = 0
): string | null {
  const remaining =
    plan.targetStudyMinutes -
    plan.studyDoneMinutes -
    plan.rewardDoneMinutes -
    pendingRewardMinutes;
  if (remaining <= 0) return null;

  const activeIds = plan.todaySubjectIds ?? todaySubjectIds;
  const { isReview } = computeNextStudyMinutes(plan.rhythm, remaining);
  const subject = isReview
    ? pickNextSubject(profile, 0, activeIds)
    : pickNextSubject(profile, plan.sessionCount + 1, activeIds);
  return subject.name;
}

export function pickNextDesire(
  desires: UserDesire[],
  sessionCount: number
): UserDesire {
  const list =
    desires.length > 0 ? desires : [{ id: "free", label: "自由時間" }];
  return list[sessionCount % list.length];
}

export function buildStudyBlock(
  subject: SubjectConfig,
  minutes: number,
  sessionCount: number,
  isReview = false
): ScheduleBlock {
  const task = isReview
    ? REVIEW_TASKS[Math.floor(Math.random() * REVIEW_TASKS.length)]
    : pickTask(subject.name, subject.units);
  const label = `${subject.name} ${minutes}分（${task}）`;

  return {
    id: `study-${sessionCount}-${Date.now()}`,
    type: "study",
    label,
    subjectId: subject.id,
    cycleIndex: sessionCount,
    startMinute: 0,
    endMinute: minutes,
    durationMinutes: minutes,
  };
}

/** 報酬表示は具体名（TikTok等）ではなくフリータイムに統一 */
export function formatRewardLabel(
  minutes: number,
  sessionCount = 0
): string {
  if (minutes <= 0) return "フリータイム";
  const variants = [
    `フリータイム ${minutes}分`,
    `フリータイム`,
    `${minutes}分のフリータイム`,
  ];
  return variants[sessionCount % variants.length];
}

export function buildRewardBlock(
  minutes: number,
  sessionCount: number
): ScheduleBlock {
  const label = formatRewardLabel(minutes, sessionCount);
  return {
    id: `reward-${sessionCount}-${Date.now()}`,
    type: "reward",
    label,
    cycleIndex: sessionCount,
    startMinute: 0,
    endMinute: minutes,
    durationMinutes: minutes,
  };
}

export function computeNextStudyMinutes(
  rhythm: RhythmState,
  remainingStudyMinutes: number
): { minutes: number; isReview: boolean } {
  if (remainingStudyMinutes <= 0) {
    return { minutes: 0, isReview: false };
  }
  if (remainingStudyMinutes < rhythm.studyMinutes) {
    return { minutes: remainingStudyMinutes, isReview: true };
  }
  return { minutes: rhythm.studyMinutes, isReview: false };
}

export function rhythmHint(rhythm: RhythmState): string {
  return `${rhythm.studyMinutes}分勉強 → ${rhythm.rewardMinutes}分自由`;
}

export function moodCoachMessage(mood: MoodCheck, rhythm: RhythmState): string {
  if (mood === "great") {
    return `絶好調！次は ${rhythm.studyMinutes}分チャレンジ`;
  }
  if (mood === "normal") {
    return `このリズムで続けよう（${rhythmHint(rhythm)}）`;
  }
  if (rhythm.consecutiveTough >= 2) {
    return `きついね。次は ${rhythm.studyMinutes}分＋自由${rhythm.rewardMinutes}分`;
  }
  return `次は ${rhythm.studyMinutes}分に短縮`;
}

export function logEntryFromBlock(
  block: ScheduleBlock,
  mood?: MoodCheck
): SessionLogEntry {
  return {
    id: block.id,
    type: block.type,
    label: block.label,
    durationMinutes: block.durationMinutes,
    mood,
  };
}
