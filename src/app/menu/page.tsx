"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { formatTodaySubjectsSummary } from "@/components/TodaySubjectSheet";
import {
  buildRoadmap,
  countStepsUntilGoal,
  getNextRewardHint,
} from "@/lib/roadmapGenerator";
import { MODE_LABELS, RoadmapStep } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export default function RoadmapPage() {
  const router = useRouter();
  const plan = useAppStore((s) => s.plan);
  const profile = useAppStore((s) => s.profile);
  const todaySubjectIds = useAppStore((s) => s.todaySubjectIds);
  const currentBlock = useAppStore((s) => s.currentBlock);
  const sessionPhase = useAppStore((s) => s.sessionPhase);
  const startSession = useAppStore((s) => s.startSession);

  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [loading, setLoading] = useState(false);

  const baseSteps = useMemo(() => {
    if (!plan) return [];
    return buildRoadmap(profile, plan, {
      todaySubjectIds,
      currentBlock,
      sessionPhase,
    });
  }, [plan, profile, todaySubjectIds, currentBlock, sessionPhase]);

  useEffect(() => {
    if (!plan) router.replace("/");
  }, [plan, router]);

  useEffect(() => {
    if (!plan) return;
    setSteps(baseSteps);

    let cancelled = false;
    setLoading(true);
    fetch("/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        plan: { ...plan, roadmapSteps: baseSteps },
        todaySubjectIds,
        currentBlock,
        sessionPhase,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.steps) {
          const merged = baseSteps.map((step) => {
            if (step.status !== "upcoming") return step;
            const ai = data.steps.find(
              (s: RoadmapStep) => s.id === step.id
            );
            return ai ? { ...step, label: ai.label ?? step.label } : step;
          });
          setSteps(merged);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseSteps, plan, profile, todaySubjectIds, currentBlock, sessionPhase]);

  if (!plan) return null;

  const stepsUntilGoal = countStepsUntilGoal(steps);
  const nextReward = getNextRewardHint(steps);
  const inSession = !!currentBlock || sessionPhase === "mood_check";

  const handleAction = () => {
    if (!inSession) startSession();
    router.push("/session");
  };

  return (
    <div className="min-h-dvh bg-bg px-5 pt-8 pb-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-center mb-2">ロードマップ</h1>
        <p className="text-xs text-muted text-center mb-4">
          {MODE_LABELS[plan.mode]} ·{" "}
          {formatTodaySubjectsSummary(
            profile.subjects,
            plan.todaySubjectIds ?? []
          )}
        </p>

        <div className="sketch-border bg-card px-4 py-3 mb-4 space-y-1 text-xs">
          <p>
            <span className="text-muted">ゴールまで</span>{" "}
            <span className="font-bold">あと{stepsUntilGoal}ステップ</span>
          </p>
          {nextReward && (
            <p>
              <span className="text-muted">次の報酬</span>{" "}
              <span className="font-bold text-reward">{nextReward}</span>
            </p>
          )}
          {plan.coachMessage && (
            <p className="text-primary">{plan.coachMessage}</p>
          )}
          {loading && (
            <p className="text-muted">AIがルートを調整中...</p>
          )}
        </div>

        <RoadmapTimeline steps={steps} />

        <button
          onClick={handleAction}
          className="sketch-btn sketch-btn-primary w-full py-4 text-lg mt-8"
        >
          {inSession ? "つづける" : "はじめる"}
        </button>

        <button
          onClick={() => router.push("/")}
          className="sketch-btn w-full py-3 text-sm mt-3"
        >
          やり直す
        </button>
      </div>
    </div>
  );
}
