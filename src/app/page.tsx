"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { DesirePicker } from "@/components/DesirePicker";
import { ModeDropdown } from "@/components/ModeDropdown";
import {
  TodaySubjectSheet,
  formatTodaySubjectsSummary,
} from "@/components/TodaySubjectSheet";
import { useAuth } from "@/components/AuthProvider";
import { hasSetupInfo, loadLocalStateBackup } from "@/lib/onboardingGate";
import { UserDesire } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

function clampMinutes(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseHours(text: string, fallbackMinutes: number): number {
  const parsed = parseFloat(text);
  if (Number.isNaN(parsed)) return fallbackMinutes;
  return clampMinutes(parsed * 60, 15, 480);
}

function parseRewardHours(text: string, fallbackMinutes: number): number {
  const parsed = parseFloat(text);
  if (Number.isNaN(parsed)) return fallbackMinutes;
  return clampMinutes(parsed * 60, 5, 240);
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, dataReady } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const todayMinutes = useAppStore((s) => s.todayMinutes);
  const todayRewardMinutes = useAppStore((s) => s.todayRewardMinutes);
  const todayRewardDesires = useAppStore((s) => s.todayRewardDesires);
  const todaySubjectIds = useAppStore((s) => s.todaySubjectIds);
  const setTodayMinutes = useAppStore((s) => s.setTodayMinutes);
  const setTodayRewardMinutes = useAppStore((s) => s.setTodayRewardMinutes);
  const setTodayRewardDesires = useAppStore((s) => s.setTodayRewardDesires);
  const setTodaySubjectIds = useAppStore((s) => s.setTodaySubjectIds);
  const setMode = useAppStore((s) => s.setMode);
  const initDailyPlanAsync = useAppStore((s) => s.initDailyPlanAsync);

  const [selected, setSelected] = useState<UserDesire[]>([]);
  const [loading, setLoading] = useState(false);
  const [studyHoursText, setStudyHoursText] = useState(() =>
    String(todayMinutes / 60)
  );
  const [rewardHoursText, setRewardHoursText] = useState(() =>
    String(todayRewardMinutes / 60)
  );
  const [subjectSheetOpen, setSubjectSheetOpen] = useState(false);

  const subjects = profile.subjects;
  const backupProfile =
    user && !hasSetupInfo(profile)
      ? loadLocalStateBackup(user.uid)?.profile
      : null;
  const setupReady =
    hasSetupInfo(profile) ||
    (!!backupProfile && hasSetupInfo(backupProfile));
  const appReady = !authLoading && dataReady && !!user;

  useEffect(() => {
    if (!appReady) return;
    if (hasSetupInfo(profile)) return;
    const backup = user ? loadLocalStateBackup(user.uid) : null;
    if (backup && hasSetupInfo(backup.profile)) {
      useAppStore.setState({
        setupLockedAt: backup.setupLockedAt ?? null,
        profile: backup.profile,
        todayMinutes: backup.todayMinutes,
        todayRewardMinutes: backup.todayRewardMinutes ?? 30,
        todayRewardDesires: backup.todayRewardDesires,
        todaySubjectIds: backup.todaySubjectIds,
      });
      return;
    }
    router.replace("/onboarding");
  }, [appReady, profile, user, router]);

  useEffect(() => {
    setStudyHoursText(String(todayMinutes / 60));
  }, [todayMinutes]);

  useEffect(() => {
    setRewardHoursText(String(todayRewardMinutes / 60));
  }, [todayRewardMinutes]);

  useEffect(() => {
    if (todayRewardDesires.length > 0) {
      setSelected(todayRewardDesires);
    }
  }, [todayRewardDesires]);

  const commitStudyHours = () => {
    const mins = parseHours(studyHoursText, todayMinutes);
    setTodayMinutes(mins);
    setStudyHoursText(String(mins / 60));
  };

  const commitRewardHours = () => {
    const mins = parseRewardHours(rewardHoursText, todayRewardMinutes);
    setTodayRewardMinutes(mins);
    setRewardHoursText(String(mins / 60));
  };

  const handlePlan = async () => {
    if (selected.length === 0 || todaySubjectIds.length === 0) return;
    setTodayRewardDesires(selected);
    setLoading(true);
    await initDailyPlanAsync();
    setLoading(false);
    router.push("/menu");
  };

  const subjectSummary = formatTodaySubjectsSummary(
    subjects,
    todaySubjectIds
  );

  if (!appReady || !setupReady) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="text-sm text-muted">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <main className="max-w-md mx-auto px-5 pt-8">
        <div className="flex justify-end mb-6">
          <ModeDropdown
            value={profile.mode}
            onChange={setMode}
            align="right"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <p className="text-xs font-bold text-muted mb-2">目標勉強時間</p>
            <div className="sketch-border bg-card p-5 text-center h-full flex flex-col justify-center">
              <input
                type="text"
                inputMode="decimal"
                value={studyHoursText}
                onChange={(e) => setStudyHoursText(e.target.value)}
                onBlur={commitStudyHours}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitStudyHours();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="1.5"
                className="w-full text-center text-4xl font-bold bg-transparent outline-none border-b-2 border-border pb-2 mb-1"
              />
              <p className="text-xs text-muted">{todayMinutes}分</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-muted mb-2">自由時間</p>
            <div className="sketch-border bg-card p-5 text-center h-full flex flex-col justify-center">
              <input
                type="text"
                inputMode="decimal"
                value={rewardHoursText}
                onChange={(e) => setRewardHoursText(e.target.value)}
                onBlur={commitRewardHours}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitRewardHours();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="0.5"
                className="w-full text-center text-4xl font-bold bg-transparent outline-none border-b-2 border-reward pb-2 mb-1 text-reward"
              />
              <p className="text-xs text-muted">{todayRewardMinutes}分</p>
            </div>
          </div>
        </div>

        <p className="text-xs font-bold text-muted mb-3">今日やる科目</p>
        <button
          type="button"
          onClick={() => setSubjectSheetOpen(true)}
          className="sketch-border bg-card w-full px-4 py-4 mb-6 text-left flex items-center justify-between"
        >
          <span className="text-sm font-semibold">{subjectSummary}</span>
          <span className="text-xs text-muted">変更 ▾</span>
        </button>

        <p className="text-xs font-bold text-muted mb-3">やりたいこと</p>
        <DesirePicker
          multiple
          candidates={profile.desires}
          selected={selected}
          onChange={setSelected}
        />

        <button
          onClick={handlePlan}
          disabled={
            loading || selected.length === 0 || todaySubjectIds.length === 0
          }
          className="sketch-btn sketch-btn-primary w-full py-4 text-lg mt-10 disabled:opacity-50"
        >
          {loading ? "準備中..." : "ロードマップを見る"}
        </button>
      </main>

      <TodaySubjectSheet
        open={subjectSheetOpen}
        subjects={subjects}
        selectedIds={todaySubjectIds}
        onChange={setTodaySubjectIds}
        onClose={() => setSubjectSheetOpen(false)}
      />

      <BottomNav />
    </div>
  );
}
