"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDaysUntilTest, getTotalDoneMinutes } from "@/lib/planGenerator";
import { MODE_LABELS } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export default function CompletePage() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);
  const resetSession = useAppStore((s) => s.resetSession);

  const daysLeft = getDaysUntilTest(profile.testDate);

  useEffect(() => {
    if (!plan) router.replace("/");
  }, [plan, router]);

  const handleHome = () => {
    resetSession();
    router.push("/");
  };

  if (!plan) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="text-sm text-muted">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg px-5 pt-12 pb-8">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-xl font-bold mb-2">今日の勉強、完了</h1>
        {plan && (
          <p className="text-sm text-muted mb-2">
            {MODE_LABELS[plan.mode]} · {plan.sessionCount}セッション
          </p>
        )}
        <p className="text-sm text-reward font-semibold mb-2">
          {plan ? getTotalDoneMinutes(plan) : 0}分 消化
        </p>
        <p className="text-xs text-muted mb-10">
          うち勉強 {plan?.studyDoneMinutes ?? 0}分 · 自由{" "}
          {plan?.rewardDoneMinutes ?? 0}分
        </p>

        {daysLeft !== null && (
          <p className="text-xs text-muted mb-8">
            テストまで {daysLeft}日
          </p>
        )}

        <button
          onClick={handleHome}
          className="sketch-btn sketch-btn-primary w-full py-4 text-lg"
        >
          また何かしたい？
        </button>
      </div>
    </div>
  );
}
