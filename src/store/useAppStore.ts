"use client";

import { create } from "zustand";
import { todayStrJST } from "@/lib/dateUtils";
import { withStableProfile } from "@/lib/onboardingGate";
import { defaultProfile } from "@/lib/userData";
import { DESIRE_PRESETS } from "@/lib/desires";
import {
  createDailyPlan,
  getRemainingRewardMinutes,
  getRemainingStudyMinutes,
  getTotalDoneMinutes,
  isPlanComplete,
} from "@/lib/planGenerator";
import {
  adjustRhythm,
  buildRewardBlock,
  buildStudyBlock,
  computeNextStudyMinutes,
  computeRewardMinutes,
  logEntryFromBlock,
  moodCoachMessage,
  pickNextSubject,
} from "@/lib/rhythmCoach";
import { sanitizeSubjects } from "@/lib/subjectUtils";
import {
  DailyPlan,
  DailyRecord,
  DEFAULT_REWARD_MINUTES,
  DEFAULT_STUDY_MINUTES,
  MoodCheck,
  RhythmState,
  ScheduleBlock,
  SessionPhase,
  StudyMode,
  CourseTrack,
  SubjectConfig,
  UserDesire,
  UserProfile,
} from "@/lib/types";

interface AppState {
  setupLockedAt: string | null;
  profile: UserProfile;
  todayMinutes: number;
  todayRewardMinutes: number;
  todayRewardDesires: UserDesire[];
  todaySubjectIds: string[];
  plan: DailyPlan | null;
  currentBlock: ScheduleBlock | null;
  sessionPhase: SessionPhase | null;
  remainingSeconds: number;
  isRunning: boolean;
  dailyRecords: DailyRecord[];

  completeOnboarding: (data: {
    grade: string;
    courseTrack: CourseTrack;
    desires: UserDesire[];
    subjects: SubjectConfig[];
    testDate: string;
  }) => void;
  setMode: (mode: StudyMode) => void;
  setTestDate: (testDate: string) => void;
  setDesires: (desires: UserDesire[]) => void;
  setTodayMinutes: (minutes: number) => void;
  setTodayRewardMinutes: (minutes: number) => void;
  setTodayRewardDesires: (desires: UserDesire[]) => void;
  setTodaySubjectIds: (ids: string[]) => void;
  initDailyPlan: () => void;
  initDailyPlanAsync: () => Promise<DailyPlan | null>;
  startSession: () => void;
  completeStudyBlock: () => boolean;
  submitMood: (mood: MoodCheck) => Promise<void>;
  completeRewardBlock: () => boolean;
  tick: () => void;
  setRunning: (running: boolean) => void;
  addDailyRecord: (
    studyMinutes: number,
    unlockedMinutes: number,
    desireLabel: string
  ) => void;
  resetSession: () => void;
  resetAll: () => void;
  setSubjects: (subjects: SubjectConfig[]) => void;
}

function defaultDesires(): UserDesire[] {
  return DESIRE_PRESETS.slice(0, 3).map((d) => ({
    id: d.id,
    label: d.label,
  }));
}

function startBlock(block: ScheduleBlock, autoRun: boolean) {
  return {
    currentBlock: block,
    remainingSeconds: block.durationMinutes * 60,
    isRunning: autoRun,
  };
}

const initialState = {
  setupLockedAt: null as string | null,
  profile: defaultProfile(),
  todayMinutes: DEFAULT_STUDY_MINUTES,
  todayRewardMinutes: DEFAULT_REWARD_MINUTES,
  todayRewardDesires: [] as UserDesire[],
  todaySubjectIds: [] as string[],
  plan: null as DailyPlan | null,
  currentBlock: null as ScheduleBlock | null,
  sessionPhase: null as SessionPhase | null,
  remainingSeconds: 0,
  isRunning: false,
  dailyRecords: [] as DailyRecord[],
};

export const useAppStore = create<AppState>()((set, get) => ({
      ...initialState,
      completeOnboarding: (data) => {
        const subjects = sanitizeSubjects(data.subjects);
        set({
          setupLockedAt: new Date().toISOString(),
          profile: {
            grade: data.grade,
            courseTrack: data.courseTrack,
            desires:
              data.desires.length > 0 ? data.desires : defaultDesires(),
            subjects,
            testDate: data.testDate,
            mode: "self_study",
            onboardingComplete: true,
          },
        });
      },

      setMode: (mode) =>
        set((s) => ({
          profile: withStableProfile(s.profile, { mode }),
        })),

      setTestDate: (testDate) =>
        set((s) => ({
          profile: withStableProfile(s.profile, { testDate }),
        })),

      setDesires: (desires) =>
        set((s) => ({
          profile: withStableProfile(s.profile, { desires }),
        })),

      setTodayMinutes: (minutes) => set({ todayMinutes: minutes }),

      setTodayRewardMinutes: (minutes) =>
        set({ todayRewardMinutes: minutes }),

      setTodayRewardDesires: (desires) =>
        set({ todayRewardDesires: desires }),

      setTodaySubjectIds: (ids) => set({ todaySubjectIds: ids }),

      initDailyPlan: () => {
        const s = get();
        const plan = {
          ...createDailyPlan(
            s.profile,
            s.todayMinutes,
            s.todayRewardMinutes
          ),
          todaySubjectIds: s.todaySubjectIds,
        };
        set({ plan, currentBlock: null, sessionPhase: null });
      },

      initDailyPlanAsync: async () => {
        const s = get();
        try {
          const res = await fetch("/api/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: s.profile,
              todayStudyMinutes: s.todayMinutes,
              todayRewardMinutes: s.todayRewardMinutes,
            }),
          });
          if (res.ok) {
            const plan = (await res.json()) as DailyPlan;
            set({
              plan: { ...plan, todaySubjectIds: s.todaySubjectIds },
              currentBlock: null,
              sessionPhase: null,
            });
            return { ...plan, todaySubjectIds: s.todaySubjectIds };
          }
        } catch {
          /* fallback */
        }
        get().initDailyPlan();
        return get().plan;
      },

      startSession: () => {
        const s = get();
        if (!s.plan) return;

        const remainingStudy = getRemainingStudyMinutes(s.plan);
        if (remainingStudy <= 0) return;

        const { minutes, isReview } = computeNextStudyMinutes(
          s.plan.rhythm,
          remainingStudy
        );
        const activeIds =
          s.plan.todaySubjectIds ?? s.todaySubjectIds;
        const subject = isReview
          ? pickNextSubject(s.profile, 0, activeIds)
          : pickNextSubject(s.profile, s.plan.sessionCount, activeIds);

        const block = buildStudyBlock(
          subject,
          minutes,
          s.plan.sessionCount,
          isReview
        );

        set({
          ...startBlock(block, false),
          sessionPhase: "study",
        });
      },

      completeStudyBlock: () => {
        const s = get();
        const { plan, currentBlock } = s;
        if (!plan || !currentBlock || currentBlock.type !== "study") {
          return false;
        }

        const updatedPlan: DailyPlan = {
          ...plan,
          studyDoneMinutes:
            plan.studyDoneMinutes + currentBlock.durationMinutes,
          log: [...plan.log, logEntryFromBlock(currentBlock)],
        };

        if (isPlanComplete(updatedPlan)) {
          set({
            plan: updatedPlan,
            currentBlock: null,
            sessionPhase: null,
            isRunning: false,
            remainingSeconds: 0,
          });
          return true;
        }

        set({
          plan: updatedPlan,
          currentBlock: null,
          sessionPhase: "mood_check",
          isRunning: false,
          remainingSeconds: 0,
        });
        return false;
      },

      submitMood: async (mood: MoodCheck) => {
        const s = get();
        const { plan } = s;
        if (!plan) return;

        let rhythm: RhythmState = adjustRhythm(plan.rhythm, mood);
        let coachMessage = moodCoachMessage(mood, rhythm);

        try {
          const res = await fetch("/api/rhythm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mood,
              rhythm: plan.rhythm,
              mode: plan.mode,
              totalDoneMinutes: getTotalDoneMinutes(plan),
              targetTotalMinutes:
                plan.targetStudyMinutes + plan.targetRewardMinutes,
              targetStudyMinutes: plan.targetStudyMinutes,
              targetRewardMinutes: plan.targetRewardMinutes,
              sessionCount: plan.sessionCount,
              profile: s.profile,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            rhythm = data.rhythm ?? rhythm;
            coachMessage = data.message ?? coachMessage;
          }
        } catch {
          /* local fallback */
        }

        const log = plan.log.map((entry, i) =>
          i === plan.log.length - 1 ? { ...entry, mood } : entry
        );
        const updatedPlan: DailyPlan = {
          ...plan,
          rhythm,
          log,
          coachMessage,
        };

        const remReward = getRemainingRewardMinutes(updatedPlan);
        const rewardMins = computeRewardMinutes(rhythm, remReward);

        if (rewardMins <= 0) {
          const withCount: DailyPlan = {
            ...updatedPlan,
            sessionCount: plan.sessionCount + 1,
          };
          if (isPlanComplete(withCount)) {
            set({
              plan: withCount,
              currentBlock: null,
              sessionPhase: null,
              isRunning: false,
              remainingSeconds: 0,
            });
            return;
          }

          const { minutes, isReview } = computeNextStudyMinutes(
            withCount.rhythm,
            getRemainingStudyMinutes(withCount)
          );
          const activeIds =
            withCount.todaySubjectIds ?? s.todaySubjectIds;
          const subject = isReview
            ? pickNextSubject(s.profile, 0, activeIds)
            : pickNextSubject(
                s.profile,
                withCount.sessionCount,
                activeIds
              );
          const studyBlock = buildStudyBlock(
            subject,
            minutes,
            withCount.sessionCount,
            isReview
          );
          set({
            plan: withCount,
            ...startBlock(studyBlock, false),
            sessionPhase: "study",
          });
          return;
        }

        const rewardBlock = buildRewardBlock(
          rewardMins,
          plan.sessionCount
        );

        set({
          plan: updatedPlan,
          ...startBlock(rewardBlock, false),
          sessionPhase: "reward",
        });
      },

      completeRewardBlock: () => {
        const s = get();
        const { plan, currentBlock } = s;
        if (!plan || !currentBlock || currentBlock.type !== "reward") {
          return true;
        }

        const rewardDoneMinutes =
          plan.rewardDoneMinutes + currentBlock.durationMinutes;
        const log = [
          ...plan.log,
          logEntryFromBlock(currentBlock),
        ];
        const updatedPlan: DailyPlan = {
          ...plan,
          rewardDoneMinutes,
          sessionCount: plan.sessionCount + 1,
          log,
        };

        if (isPlanComplete(updatedPlan)) {
          set({
            plan: updatedPlan,
            currentBlock: null,
            sessionPhase: null,
            isRunning: false,
            remainingSeconds: 0,
          });
          return true;
        }

        const { minutes, isReview } = computeNextStudyMinutes(
          updatedPlan.rhythm,
          getRemainingStudyMinutes(updatedPlan)
        );
        const activeIds =
          updatedPlan.todaySubjectIds ?? s.todaySubjectIds;
        const subject = isReview
          ? pickNextSubject(s.profile, 0, activeIds)
          : pickNextSubject(
              s.profile,
              updatedPlan.sessionCount,
              activeIds
            );

        const studyBlock = buildStudyBlock(
          subject,
          minutes,
          updatedPlan.sessionCount,
          isReview
        );

        set({
          plan: updatedPlan,
          ...startBlock(studyBlock, false),
          sessionPhase: "study",
        });
        return false;
      },

      tick: () =>
        set((s) => ({
          remainingSeconds: Math.max(0, s.remainingSeconds - 1),
        })),

      setRunning: (running) => set({ isRunning: running }),

      addDailyRecord: (studyMinutes, unlockedMinutes, desireLabel) => {
        const today = todayStrJST();
        set((s) => ({
          dailyRecords: [
            ...s.dailyRecords.filter((r) => r.date !== today),
            { date: today, studyMinutes, unlockedMinutes, desireLabel },
          ],
        }));
      },

      resetSession: () =>
        set({
          plan: null,
          currentBlock: null,
          sessionPhase: null,
          remainingSeconds: 0,
          isRunning: false,
        }),

      resetAll: () =>
        set({ ...initialState, setupLockedAt: null, profile: defaultProfile() }),

      setSubjects: (subjects) =>
        set((s) => {
          const valid = sanitizeSubjects(
            subjects.filter((sub) => sub.name.trim())
          );
          return {
            profile: withStableProfile(s.profile, { subjects: valid }),
          };
        }),
}));

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
