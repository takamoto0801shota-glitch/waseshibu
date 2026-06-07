import { loadLocalStateBackup, saveLocalStateBackup } from "@/lib/onboardingGate";
import { enforceSetupLock } from "@/lib/userData";
import { applyCloudStateToStore } from "@/lib/storeHydrate";
import { CloudAppState } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

function sessionProgress(state: CloudAppState): number {
  if (!state.plan) return 0;
  return (
    state.plan.studyDoneMinutes +
    state.plan.rewardDoneMinutes +
    state.plan.sessionCount
  );
}

/** クラウドとバックアップをマージ（進行中セッションを優先） */
export function mergeCloudWithBackup(
  cloud: CloudAppState,
  backup: CloudAppState | null
): CloudAppState {
  if (!backup) return cloud;
  const merged = enforceSetupLock(cloud);

  if (!backup.plan) return merged;

  const keepBackupSession =
    !merged.plan || sessionProgress(backup) > sessionProgress(merged);

  if (!keepBackupSession) return merged;

  return enforceSetupLock({
    ...merged,
    plan: backup.plan,
    currentBlock: backup.currentBlock,
    sessionPhase: backup.sessionPhase,
    remainingSeconds: backup.remainingSeconds,
    isRunning: backup.isRunning,
    todaySubjectIds:
      backup.todaySubjectIds.length > 0
        ? backup.todaySubjectIds
        : merged.todaySubjectIds,
    todayRewardDesires:
      backup.todayRewardDesires.length > 0
        ? backup.todayRewardDesires
        : merged.todayRewardDesires,
  });
}

export function pickCloudStateFromStore(): CloudAppState {
  const s = useAppStore.getState();
  return {
    setupLockedAt: s.setupLockedAt,
    profile: s.profile,
    todayMinutes: s.todayMinutes,
    todayRewardMinutes: s.todayRewardMinutes,
    todayRewardDesires: s.todayRewardDesires,
    todaySubjectIds: s.todaySubjectIds,
    plan: s.plan,
    dailyRecords: s.dailyRecords,
    currentBlock: s.currentBlock,
    sessionPhase: s.sessionPhase,
    remainingSeconds: s.remainingSeconds,
    isRunning: s.isRunning,
  };
}

/** 進行中の勉強セッションがあるか */
export function hasActiveSession(state?: CloudAppState): boolean {
  const s = state ?? pickCloudStateFromStore();
  return !!(
    s.plan &&
    (s.currentBlock || s.sessionPhase === "mood_check")
  );
}

/** localStorage からセッションだけ復元 */
export function tryRestoreSessionFromBackup(uid: string): boolean {
  const backup = loadLocalStateBackup(uid);
  if (!backup?.plan) return false;

  const current = pickCloudStateFromStore();
  if (current.plan && sessionProgress(current) >= sessionProgress(backup)) {
    return true;
  }

  applyCloudStateToStore(
    mergeCloudWithBackup(enforceSetupLock(current), backup)
  );
  return true;
}

/** プロフィール設定のみマージ（セッションは維持） */
export function mergeSetupProfileIntoStore(state: CloudAppState): void {
  const locked = enforceSetupLock(state);
  const current = pickCloudStateFromStore();

  useAppStore.setState({
    setupLockedAt: locked.setupLockedAt ?? current.setupLockedAt,
    profile: locked.profile,
    todayMinutes: locked.todayMinutes,
    todayRewardMinutes: locked.todayRewardMinutes,
    todayRewardDesires:
      current.todayRewardDesires.length > 0
        ? current.todayRewardDesires
        : locked.todayRewardDesires,
    todaySubjectIds:
      current.todaySubjectIds.length > 0
        ? current.todaySubjectIds
        : locked.todaySubjectIds,
    dailyRecords:
      locked.dailyRecords.length > 0
        ? locked.dailyRecords
        : current.dailyRecords,
  });
}

/** セッション変更をすぐ localStorage に保存 */
export function persistSessionSnapshot(uid: string): void {
  saveLocalStateBackup(uid, enforceSetupLock(pickCloudStateFromStore()));
}
