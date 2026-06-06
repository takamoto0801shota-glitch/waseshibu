export type StudyMode = "light" | "self_study" | "serious" | "top_grade";

export const MODE_LABELS: Record<StudyMode, string> = {
  light: "軽めモード",
  self_study: "自習モード",
  serious: "本気モード",
  top_grade: "学年一位モード",
};

/** 開始リズム（AIがセッションごとに調整） */
export const MODE_BASELINE: Record<
  StudyMode,
  { studyMinutes: number; rewardMinutes: number }
> = {
  light: { studyMinutes: 30, rewardMinutes: 10 },
  self_study: { studyMinutes: 45, rewardMinutes: 10 },
  serious: { studyMinutes: 60, rewardMinutes: 10 },
  top_grade: { studyMinutes: 90, rewardMinutes: 10 },
};

/** @deprecated MODE_BASELINE を使用 */
export const MODE_CYCLE = MODE_BASELINE;

export const MODE_HINTS: Record<StudyMode, string> = {
  light: "開始 30分 → 10分自由",
  self_study: "開始 45分 → 10分自由",
  serious: "開始 60分 → 10分自由",
  top_grade: "開始 90分 → 10分自由",
};

export type MoodCheck = "great" | "normal" | "tough";

export const MOOD_OPTIONS: {
  value: MoodCheck;
  emoji: string;
  label: string;
}[] = [
  { value: "great", emoji: "😀", label: "絶好調" },
  { value: "normal", emoji: "🙂", label: "普通" },
  { value: "tough", emoji: "😫", label: "きつい" },
];

export type SessionPhase = "study" | "mood_check" | "reward";

export interface RhythmState {
  studyMinutes: number;
  rewardMinutes: number;
  consecutiveTough: number;
}

export type BlockType = "study" | "reward";

export interface SubjectConfig {
  id: string;
  name: string;
  units: string[];
  strength: "strong" | "normal" | "weak";
}

export type CourseTrack = "arts" | "science";

export interface UserDesire {
  id: string;
  label: string;
}

export interface SessionLogEntry {
  id: string;
  type: BlockType;
  label: string;
  durationMinutes: number;
  mood?: MoodCheck;
}

export interface UserProfile {
  grade: string;
  courseTrack: CourseTrack;
  desires: UserDesire[];
  subjects: SubjectConfig[];
  testDate: string;
  mode: StudyMode;
  onboardingComplete: boolean;
}

export interface ScheduleBlock {
  id: string;
  type: BlockType;
  label: string;
  subjectId?: string;
  cycleIndex?: number;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
}

export type RoadmapStepStatus = "done" | "current" | "upcoming";

export interface RoadmapStep {
  id: string;
  type: BlockType | "goal" | "checkpoint";
  label: string;
  status: RoadmapStepStatus;
  minutes?: number;
}

export interface DailyPlan {
  mode: StudyMode;
  targetStudyMinutes: number;
  rhythm: RhythmState;
  log: SessionLogEntry[];
  studyDoneMinutes: number;
  rewardDoneMinutes: number;
  sessionCount: number;
  todaySubjectIds?: string[];
  coachMessage?: string;
  roadmapSteps?: RoadmapStep[];
}

/** @deprecated DailyPlan を使用 */
export interface StudyCycle {
  id: string;
  studyLabel: string;
  studyMinutes: number;
  rewardLabel: string;
  rewardMinutes: number;
  subjectId?: string;
}

/** @deprecated DailyPlan を使用 */
export interface DailySchedule {
  blocks: ScheduleBlock[];
  cycles: StudyCycle[];
  totalMinutes: number;
  totalStudyMinutes: number;
  totalRewardMinutes: number;
  mode: StudyMode;
}

export interface DailyRecord {
  date: string;
  studyMinutes: number;
  unlockedMinutes: number;
  desireLabel: string;
}
