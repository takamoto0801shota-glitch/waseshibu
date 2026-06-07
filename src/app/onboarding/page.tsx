"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DesirePicker } from "@/components/DesirePicker";
import { GradePicker } from "@/components/GradePicker";
import { SubjectSelector } from "@/components/SubjectSelector";
import { buildAllSubjects, needsCourseTrack } from "@/lib/subjectCatalog";
import { CourseTrack, SubjectConfig, UserDesire } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { lockSetupPermanently } from "@/lib/onboardingGate";
import { useAppStore } from "@/store/useAppStore";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, dataReady, saveCloudState } = useAuth();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [desires, setDesires] = useState<UserDesire[]>([]);
  const [grade, setGrade] = useState("");
  const [courseTrack, setCourseTrack] = useState<CourseTrack>("arts");
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleGradeChange = (g: string) => {
    setGrade(g);
    setCourseTrack("arts");
    setSubjects(buildAllSubjects(g, "arts"));
  };

  const handleComplete = async () => {
    if (subjects.length < 1) return;
    setSaving(true);
    setSaveError("");
    try {
      completeOnboarding({
        grade,
        courseTrack,
        desires,
        subjects,
        testDate: "",
      });
      await saveCloudState();
      if (user) lockSetupPermanently(user.uid);
      router.replace("/");
    } catch {
      setSaveError("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !dataReady) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="text-sm text-muted">読み込み中...</p>
      </div>
    );
  }

  const canNext =
    step === 0
      ? desires.length >= 1
      : step === 1
        ? grade !== ""
        : subjects.length >= 1;

  return (
    <div className="min-h-dvh bg-bg px-5 pt-10 pb-8">
      <div className="max-w-md mx-auto">
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? "bg-reward" : "bg-border"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h1 className="text-xl font-bold mb-2">
              普段やりたいことは？
            </h1>
            <p className="text-xs text-muted mb-6">
              何でも好きなことを遠慮なく全て選択してください。
            </p>
            <DesirePicker
              multiple
              allowCustom
              selected={desires}
              onChange={setDesires}
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold mb-6">学年</h1>
            <GradePicker value={grade} onChange={handleGradeChange} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold mb-1">科目</h1>
            <p className="text-xs text-muted mb-4">
              {grade}
              {needsCourseTrack(grade) &&
                ` · ${courseTrack === "arts" ? "文系" : "理系"}`}
              <span className="block mt-1">
                習わない科目があれば選択してください。
              </span>
            </p>
            <SubjectSelector
              grade={grade}
              courseTrack={courseTrack}
              onCourseTrackChange={(track) => {
                setCourseTrack(track);
                setSubjects(buildAllSubjects(grade, track));
              }}
              subjects={subjects}
              onChange={setSubjects}
            />
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-600 mt-6">{saveError}</p>
        )}

        <div className="flex gap-3 mt-10">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="sketch-btn flex-1 py-3"
            >
              戻る
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="sketch-btn sketch-btn-primary flex-1 py-3 disabled:opacity-50"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={subjects.length < 1 || saving}
              className="sketch-btn sketch-btn-primary flex-1 py-3 disabled:opacity-50"
            >
              {saving ? "保存中..." : "はじめる"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
