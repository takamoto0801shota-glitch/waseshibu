"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DESIRE_PRESETS } from "@/lib/desires";
import {
  createDailyPlan,
  getRemainingTotalMinutes,
  getTotalDoneMinutes,
} from "@/lib/planGenerator";
import {
  adjustRhythm,
  buildRewardBlock,
  buildStudyBlock,
  computeNextStudyMinutes,
  computeRewardMinutes,
  logEntryFromBlock,
  moodCoachMessage,
  normalizeMode,
  pickNextSubject,
} from "@/lib/rhythmCoach";
import { filterSubjects } from "@/lib/exclusions";
import { sanitizeSubjects } from "@/lib/subjectUtils";
import {
  DailyPlan,
  DailyRecord,
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
  profile: UserProfile;
  todayMinutes: number;
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
  setSubjects: (subjects: SubjectConfig[]) => void;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: {
        grade: "",
        courseTrack: "arts",
        desires: defaultDesires(),
        subjects: [],
        testDate: "",
        mode: "self_study",
        onboardingComplete: false,
      },
      todayMinutes: 150,
      todayRewardDesires: [],
      todaySubjectIds: [],
      plan: null,
      currentBlock: null,
      sessionPhase: null,
      remainingSeconds: 0,
      isRunning: false,
      dailyRecords: [],

      completeOnboarding: (data) => {
        const subjects = sanitizeSubjects(data.subjects);
        set({
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
        set((s) => ({ profile: { ...s.profile, mode } })),

      setTestDate: (testDate) =>
        set((s) => ({ profile: { ...s.profile, testDate } })),

      setDesires: (desires) =>
        set((s) => ({ profile: { ...s.profile, desires } })),

      setTodayMinutes: (minutes) => set({ todayMinutes: minutes }),

      setTodayRewardDesires: (desires) =>
        set({ todayRewardDesires: desires }),

      setTodaySubjectIds: (ids) => set({ todaySubjectIds: ids }),

      initDailyPlan: () => {
        const s = get();
        const plan = {
          ...createDailyPlan(s.profile, s.todayMinutes),
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
              todayMinutes: s.todayMinutes,
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

        const remaining = getRemainingTotalMinutes(s.plan);
        if (remaining <= 0) return;

        const { minutes, isReview } = computeNextStudyMinutes(
          s.plan.rhythm,
          remaining
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

        if (getRemainingTotalMinutes(updatedPlan) <= 0) {
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
          sessionPhase: "mood_check",
          isRunning: false,
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
              targetTotalMinutes: plan.targetStudyMinutes,
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

        const remaining = getRemainingTotalMinutes(updatedPlan);
        const rewardMins = computeRewardMinutes(rhythm, remaining);

        if (rewardMins <= 0) {
          const withCount: DailyPlan = {
            ...updatedPlan,
            sessionCount: plan.sessionCount + 1,
          };
          if (getRemainingTotalMinutes(withCount) <= 0) {
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
            getRemainingTotalMinutes(withCount)
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

        const remaining = getRemainingTotalMinutes(updatedPlan);

        if (remaining <= 0) {
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
          remaining
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
        const today = todayStr();
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

      setSubjects: (subjects) =>
        set((s) => {
          const valid = sanitizeSubjects(
            subjects.filter((sub) => sub.name.trim())
          );
          return {
            profile: { ...s.profile, subjects: valid },
          };
        }),
    }),
    {
      name: "waseshibu-v6",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.profile.courseTrack) {
          state.profile.courseTrack = "arts";
        }
        state.profile.mode = normalizeMode(state.profile.mode);
        if (!state.profile.desires || state.profile.desires.length === 0) {
          state.profile.desires = defaultDesires();
        }
        const subjects = filterSubjects(state.profile.subjects);
        state.profile.subjects = subjects;
        const validIds = new Set(subjects.map((s) => s.id));
        state.todaySubjectIds = state.todaySubjectIds.filter((id) =>
          validIds.has(id)
        );
        if (!state.plan || "blocks" in (state.plan as object)) {
          state.plan = null;
        }
        state.currentBlock = state.currentBlock ?? null;
      },
    }
  )
);

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
