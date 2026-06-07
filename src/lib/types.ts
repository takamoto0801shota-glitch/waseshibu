export type StudyMode = "light" | "self_study" | "serious" | "top_grade";

export const MODE_LABELS: Record<StudyMode, string> = {
  light: "軽めモード",
  self_study: "自習モード",
  serious: "本気モード",
  top_grade: "学年一位モード",
};

/** ホーム画面のデフォルト時間（勉強と自由は別々に設定・計算） */
export const DEFAULT_STUDY_MINUTES = 90;
export const DEFAULT_REWARD_MINUTES = 30;

/** 自由時間未設定時のデフォルト比率（勉強:自由 = 2:1） */
export const DEFAULT_STUDY_REWARD_RATIO = { study: 2, reward: 1 } as const;

export function defaultRewardMinutesFromStudy(studyMinutes: number): number {
  const { study, reward } = DEFAULT_STUDY_REWARD_RATIO;
  return Math.max(5, Math.round((studyMinutes / study) * reward));
}

/** モードごとの勉強:自由の目標比率 */
export const MODE_STUDY_REWARD_RATIO: Record<
  StudyMode,
  { study: number; reward: number }
> = {
  light: { study: 2, reward: 1 },
  self_study: { study: 3, reward: 1 },
  serious: { study: 4, reward: 1 },
  top_grade: { study: 5, reward: 1 },
};

/** 開始リズム（比率に基づくキリのいい交互時間） */
export const MODE_BASELINE: Record<
  StudyMode,
  { studyMinutes: number; rewardMinutes: number }
> = {
  light: { studyMinutes: 30, rewardMinutes: 15 },
  self_study: { studyMinutes: 45, rewardMinutes: 15 },
  serious: { studyMinutes: 60, rewardMinutes: 15 },
  top_grade: { studyMinutes: 75, rewardMinutes: 15 },
};

/** @deprecated MODE_BASELINE を使用 */
export const MODE_CYCLE = MODE_BASELINE;

export const MODE_HINTS: Record<StudyMode, string> = {
  light: "勉強:自由 ≈ 2:1",
  self_study: "勉強:自由 ≈ 3:1",
  serious: "勉強:自由 ≈ 4:1",
  top_grade: "勉強:自由 ≈ 5:1",
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
  targetRewardMinutes: number;
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

/** Supabase Auth ユーザー情報 */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

/** クラウド保存用アプリ状態 */
export interface CloudAppState {
  /** 初期設定完了の永久ロック（ISO日時。明示リセット時のみ削除） */
  setupLockedAt?: string | null;
  profile: UserProfile;
  todayMinutes: number;
  todayRewardMinutes: number;
  todayRewardDesires: UserDesire[];
  todaySubjectIds: string[];
  plan: DailyPlan | null;
  dailyRecords: DailyRecord[];
  currentBlock: ScheduleBlock | null;
  sessionPhase: SessionPhase | null;
  remainingSeconds?: number;
  isRunning?: boolean;
}
