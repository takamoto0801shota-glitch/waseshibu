"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MoodCheckPanel } from "@/components/MoodCheck";
import { TodayDigestBar } from "@/components/TodayDigestBar";
import { useTimer } from "@/hooks/useTimer";
import { peekNextSubjectName } from "@/lib/rhythmCoach";
import { formatTime, useAppStore } from "@/store/useAppStore";
import { MoodCheck } from "@/lib/types";

function SessionShell({
  children,
  bg = "bg-bg",
  plan,
  currentBlock = null,
  remainingSeconds = 0,
}: {
  children: ReactNode;
  bg?: string;
  plan: NonNullable<ReturnType<typeof useAppStore.getState>["plan"]>;
  currentBlock?: ReturnType<typeof useAppStore.getState>["currentBlock"];
  remainingSeconds?: number;
}) {
  return (
    <div className={`min-h-dvh ${bg} flex flex-col`}>
      <TodayDigestBar
        plan={plan}
        currentBlock={currentBlock}
        remainingSeconds={remainingSeconds}
      />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {children}
      </div>
    </div>
  );
}

export default function SessionPage() {
  const router = useRouter();
  const plan = useAppStore((s) => s.plan);
  const profile = useAppStore((s) => s.profile);
  const todayRewardDesires = useAppStore((s) => s.todayRewardDesires);
  const todaySubjectIds = useAppStore((s) => s.todaySubjectIds);
  const currentBlock = useAppStore((s) => s.currentBlock);
  const sessionPhase = useAppStore((s) => s.sessionPhase);
  const remainingSeconds = useAppStore((s) => s.remainingSeconds);
  const isRunning = useAppStore((s) => s.isRunning);
  const completeStudyBlock = useAppStore((s) => s.completeStudyBlock);
  const submitMood = useAppStore((s) => s.submitMood);
  const completeRewardBlock = useAppStore((s) => s.completeRewardBlock);
  const setRunning = useAppStore((s) => s.setRunning);
  const addDailyRecord = useAppStore((s) => s.addDailyRecord);

  const [moodLoading, setMoodLoading] = useState(false);

  useTimer();

  useEffect(() => {
    if (!plan) router.replace("/");
  }, [plan, router]);

  useEffect(() => {
    if (!plan) return;
    if (!currentBlock && sessionPhase !== "mood_check") {
      router.replace("/menu");
    }
  }, [plan, currentBlock, sessionPhase, router]);

  const finishSession = () => {
    if (!plan) return;
    const desireLabel =
      todayRewardDesires[0]?.label ??
      profile.desires[0]?.label ??
      "フリータイム";
    addDailyRecord(
      plan.studyDoneMinutes,
      plan.rewardDoneMinutes,
      desireLabel
    );
    router.push("/complete");
  };

  const handleStudyDone = () => {
    const finished = completeStudyBlock();
    if (finished) finishSession();
  };

  const handleMood = async (mood: MoodCheck) => {
    setMoodLoading(true);
    try {
      await submitMood(mood);
    } catch {
      /* rhythm API 失敗時もローカル調整で続行済み */
    } finally {
      setMoodLoading(false);
    }
  };

  const handleRewardDone = () => {
    const finished = completeRewardBlock();
    if (finished) finishSession();
  };

  if (!plan) return null;

  if (sessionPhase === "mood_check") {
    return (
      <SessionShell plan={plan}>
        <h1 className="text-lg font-bold mb-2">調子はどう？</h1>
        <p className="text-sm text-muted mb-8">タップするだけ</p>
        <MoodCheckPanel onSelect={handleMood} loading={moodLoading} />
      </SessionShell>
    );
  }

  if (!currentBlock) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="text-sm text-muted">読み込み中...</p>
      </div>
    );
  }

  if (currentBlock.type === "study") {
    const studyPreview =
      !isRunning && remainingSeconds === currentBlock.durationMinutes * 60;

    if (studyPreview) {
      return (
        <SessionShell
          plan={plan}
          currentBlock={currentBlock}
          remainingSeconds={remainingSeconds}
        >
          <h1 className="text-lg font-bold mb-2">{currentBlock.label}</h1>
          <p className="text-4xl font-light tabular-nums mb-10">
            {formatTime(currentBlock.durationMinutes * 60)}
          </p>
          <button
            onClick={() => setRunning(true)}
            className="sketch-btn sketch-btn-primary w-full max-w-xs py-4 text-lg mb-3"
          >
            スタート
          </button>
          <button
            onClick={handleStudyDone}
            className="sketch-btn w-full max-w-xs py-3"
          >
            通過
          </button>
        </SessionShell>
      );
    }

    return (
      <SessionShell
        plan={plan}
        currentBlock={currentBlock}
        remainingSeconds={remainingSeconds}
      >
        <div className="w-64 h-64 rounded-full border-[6px] border-primary flex flex-col items-center justify-center mb-4">
          <span className="text-sm text-muted mb-1">このセッション</span>
          <span className="text-4xl font-bold tabular-nums">
            {formatTime(remainingSeconds)}
          </span>
        </div>

        <p className="text-base font-semibold mb-12">{currentBlock.label}</p>

        <button
          onClick={handleStudyDone}
          className="sketch-btn sketch-btn-primary w-full max-w-xs py-4 text-lg"
        >
          通過
        </button>
      </SessionShell>
    );
  }

  if (currentBlock.type === "reward") {
    const isPreview =
      !isRunning && remainingSeconds === currentBlock.durationMinutes * 60;

    if (isPreview) {
      const nextSubject = peekNextSubjectName(
        profile,
        plan,
        todaySubjectIds
      );

      return (
        <SessionShell plan={plan} bg="bg-reward-light">
          {plan.coachMessage && (
            <p className="text-xs text-primary font-semibold mb-4 text-center">
              {plan.coachMessage}
            </p>
          )}
          <h1 className="text-lg font-bold text-reward mb-2">
            {currentBlock.label}
          </h1>
          <p className="text-4xl font-light tabular-nums mb-2">
            {formatTime(currentBlock.durationMinutes * 60)}
          </p>
          {nextSubject && (
            <p className="text-sm font-semibold text-primary mb-2">
              次は{nextSubject}です
            </p>
          )}
          <p className="text-sm text-muted mb-10">
            リラックスして好きなことをしてください。
          </p>
          <button
            onClick={() => setRunning(true)}
            className="sketch-btn sketch-btn-primary w-full max-w-xs py-4 text-lg mb-3"
          >
            スタート
          </button>
          <button
            onClick={handleRewardDone}
            className="sketch-btn w-full max-w-xs py-3"
          >
            スキップ
          </button>
        </SessionShell>
      );
    }

    return (
      <SessionShell plan={plan} bg="bg-reward-light">
        <h1 className="text-base font-bold text-reward mb-6">
          {currentBlock.label}
        </h1>
        <div className="w-56 h-56 rounded-full border-[6px] border-reward flex items-center justify-center mb-8">
          <span className="text-5xl font-light tabular-nums">
            {formatTime(remainingSeconds)}
          </span>
        </div>
        <button
          onClick={handleRewardDone}
          className="sketch-btn sketch-btn-primary w-full max-w-xs py-4 text-lg"
        >
          完了
        </button>
      </SessionShell>
    );
  }

  return null;
}
