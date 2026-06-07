"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { DesirePicker } from "@/components/DesirePicker";
import { ModeDropdown } from "@/components/ModeDropdown";
import { SubjectSelector } from "@/components/SubjectSelector";
import { TestDatePicker } from "@/components/TestDatePicker";
import { getDaysUntilTest } from "@/lib/planGenerator";
import { MODE_HINTS } from "@/lib/types";
import { CourseTrack, SubjectConfig, UserDesire } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { clearSetupLock } from "@/lib/onboardingGate";
import { defaultProfile } from "@/lib/userData";
import { useAppStore } from "@/store/useAppStore";

export default function MyPage() {
  const router = useRouter();
  const { user, signOut, saveCloudState } = useAuth();
  const uid = user?.uid;
  const profile = useAppStore((s) => s.profile);
  const dailyRecords = useAppStore((s) => s.dailyRecords);
  const setMode = useAppStore((s) => s.setMode);
  const setTestDate = useAppStore((s) => s.setTestDate);
  const setDesires = useAppStore((s) => s.setDesires);
  const setSubjects = useAppStore((s) => s.setSubjects);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SubjectConfig[]>(profile.subjects);
  const [draftTrack, setDraftTrack] = useState<CourseTrack>(
    profile.courseTrack ?? "arts"
  );
  const [draftDesires, setDraftDesires] = useState<UserDesire[]>(
    profile.desires
  );
  const [editingDesires, setEditingDesires] = useState(false);
  const [resetting, setResetting] = useState(false);

  const daysLeft = getDaysUntilTest(profile.testDate);
  const totalUnlocked = dailyRecords.reduce(
    (s, r) => s + r.unlockedMinutes,
    0
  );
  const totalStudy = dailyRecords.reduce((s, r) => s + r.studyMinutes, 0);

  const handleReset = async () => {
    setResetting(true);
    try {
      if (uid) clearSetupLock(uid);
      useAppStore.setState({
        setupLockedAt: null,
        profile: { ...defaultProfile(), desires: profile.desires },
        plan: null,
        currentBlock: null,
        sessionPhase: null,
        remainingSeconds: 0,
        isRunning: false,
      });
      await saveCloudState({ allowOnboardingReset: true });
      router.push("/onboarding?force=1");
    } finally {
      setResetting(false);
    }
  };

  const startEdit = () => {
    setDraft(profile.subjects.map((s) => ({ ...s, units: [...s.units] })));
    setDraftTrack(profile.courseTrack ?? "arts");
    setEditing(true);
  };

  const saveSubjects = () => {
    setSubjects(draft);
    useAppStore.setState((s) => ({
      profile: { ...s.profile, courseTrack: draftTrack },
    }));
    setEditing(false);
  };

  const saveDesires = () => {
    setDesires(draftDesires);
    setEditingDesires(false);
  };

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <main className="max-w-md mx-auto px-5 pt-8">
        <h1 className="text-xl font-bold mb-4">マイページ</h1>

        {user && (
          <div className="sketch-border bg-card p-4 mb-5 flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center text-sm font-bold">
                {(user.displayName || "U").charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-xs text-muted truncate">{user.email}</p>
            </div>
          </div>
        )}

        <div className="reward-card p-5 mb-5 text-center">
          <p className="text-3xl font-bold">{totalUnlocked}分</p>
          <p className="text-sm text-muted mt-1">累計解放時間</p>
          <p className="text-xs text-muted mt-2">
            通貨 {Math.floor(totalStudy / 60)}時間
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">やりたいこと</p>
          {!editingDesires && (
            <button
              onClick={() => {
                setDraftDesires(profile.desires);
                setEditingDesires(true);
              }}
              className="text-xs text-reward font-semibold"
            >
              編集
            </button>
          )}
        </div>

        {editingDesires ? (
          <div className="mb-5">
            <DesirePicker
              multiple
              allowCustom
              selected={draftDesires}
              onChange={setDraftDesires}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingDesires(false)}
                className="sketch-btn flex-1 py-3 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={saveDesires}
                disabled={draftDesires.length === 0}
                className="sketch-btn sketch-btn-primary flex-1 py-3 text-sm disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="sketch-border bg-card p-4 mb-5">
            <div className="flex flex-wrap gap-2">
              {profile.desires.map((d) => (
                <span
                  key={d.id}
                  className="px-3 py-1 text-xs rounded-full border border-reward/30 bg-reward/5 text-reward font-bold"
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.grade && (
          <div className="sketch-border bg-card p-4 mb-5">
            <p className="text-sm font-bold">
              {profile.grade}
              {(profile.grade === "高校2年" || profile.grade === "高校3年") &&
                ` · ${profile.courseTrack === "science" ? "理系" : "文系"}`}
            </p>
          </div>
        )}

        <p className="text-sm font-bold mb-3">設定</p>
        <div className="sketch-border bg-card px-3 py-3 mb-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold">テスト日</p>
              {profile.testDate && daysLeft !== null ? (
                <p className="text-[10px] text-primary font-semibold">
                  あと {daysLeft}日
                </p>
              ) : (
                <p className="text-[10px] text-muted">未設定</p>
              )}
            </div>
            <TestDatePicker
              compact
              value={profile.testDate}
              onChange={setTestDate}
              onSkip={() => setTestDate("")}
            />
          </div>
          <div>
            <p className="text-xs font-bold mb-2">勉強サイクル（モード）</p>
            <ModeDropdown value={profile.mode} onChange={setMode} />
            <p className="text-[10px] text-muted mt-1">
              {MODE_HINTS[profile.mode]}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">通貨科目</p>
          {!editing && (
            <button
              onClick={startEdit}
              className="text-xs text-primary font-semibold"
            >
              編集
            </button>
          )}
        </div>

        {editing ? (
          <div className="mb-5">
            <SubjectSelector
              grade={profile.grade}
              courseTrack={draftTrack}
              onCourseTrackChange={(track) => {
                setDraftTrack(track);
                setDraft([]);
              }}
              subjects={draft}
              onChange={setDraft}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditing(false)}
                className="sketch-btn flex-1 py-3 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={saveSubjects}
                disabled={draft.length === 0}
                className="sketch-btn sketch-btn-primary flex-1 py-3 text-sm disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="sketch-border bg-card p-5 mb-5">
            <div className="flex flex-wrap gap-2">
              {profile.subjects.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-0.5 text-xs rounded-full border border-border bg-bg"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={resetting}
          className="sketch-btn w-full py-3 text-sm mb-3 disabled:opacity-50"
        >
          {resetting ? "リセット中..." : "初回設定をやり直す"}
        </button>

        <button
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
          className="sketch-btn w-full py-3 text-sm text-muted"
        >
          Googleアカウントからログアウト
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
