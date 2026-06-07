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
import { isOnboardingDone } from "@/lib/onboardingGate";
import { UserDesire } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, dataReady } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const todayMinutes = useAppStore((s) => s.todayMinutes);
  const todayRewardDesires = useAppStore((s) => s.todayRewardDesires);
  const todaySubjectIds = useAppStore((s) => s.todaySubjectIds);
  const setTodayMinutes = useAppStore((s) => s.setTodayMinutes);
  const setTodayRewardDesires = useAppStore((s) => s.setTodayRewardDesires);
  const setTodaySubjectIds = useAppStore((s) => s.setTodaySubjectIds);
  const setMode = useAppStore((s) => s.setMode);
  const initDailyPlanAsync = useAppStore((s) => s.initDailyPlanAsync);

  const [selected, setSelected] = useState<UserDesire[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoursText, setHoursText] = useState(() => String(todayMinutes / 60));
  const [subjectSheetOpen, setSubjectSheetOpen] = useState(false);

  const subjects = profile.subjects;
  const ready =
    !authLoading &&
    dataReady &&
    !!user &&
    isOnboardingDone(profile, user.uid);

  useEffect(() => {
    setHoursText(String(todayMinutes / 60));
  }, [todayMinutes]);

  useEffect(() => {
    if (todayRewardDesires.length > 0) {
      setSelected(todayRewardDesires);
    }
  }, [todayRewardDesires]);

  const commitHours = () => {
    const parsed = parseFloat(hoursText);
    if (Number.isNaN(parsed)) {
      setHoursText(String(todayMinutes / 60));
      return;
    }
    const clamped = Math.min(8, Math.max(0.5, parsed));
    const mins = Math.round(clamped * 60);
    setTodayMinutes(mins);
    setHoursText(String(clamped));
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

  if (!ready) {
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

        <p className="text-xs font-bold text-muted mb-3">今日の時間</p>
        <div className="sketch-border bg-card p-8 mb-6 text-center">
          <input
            type="text"
            inputMode="decimal"
            value={hoursText}
            onChange={(e) => setHoursText(e.target.value)}
            onBlur={commitHours}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitHours();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="2.5"
            className="w-full text-center text-5xl font-bold bg-transparent outline-none border-b-2 border-border pb-2 mb-1"
          />
          <p className="text-sm text-muted">
            勉強＋自由時間（{todayMinutes}分）
          </p>
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
