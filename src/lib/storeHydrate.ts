import { enforceSetupLock } from "@/lib/userData";
import { CloudAppState, DEFAULT_REWARD_MINUTES } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

/** クラウド／バックアップ状態を Zustand ストアへ反映 */
export function applyCloudStateToStore(state: CloudAppState): void {
  const locked = enforceSetupLock(state);
  useAppStore.setState({
    setupLockedAt: locked.setupLockedAt ?? null,
    profile: locked.profile,
    todayMinutes: locked.todayMinutes,
    todayRewardMinutes:
      locked.todayRewardMinutes ?? DEFAULT_REWARD_MINUTES,
    todayRewardDesires: locked.todayRewardDesires,
    todaySubjectIds: locked.todaySubjectIds,
    plan: locked.plan,
    dailyRecords: locked.dailyRecords,
    currentBlock: locked.currentBlock,
    sessionPhase: locked.sessionPhase,
    remainingSeconds:
      locked.remainingSeconds ??
      (locked.currentBlock
        ? locked.currentBlock.durationMinutes * 60
        : 0),
    isRunning: locked.isRunning ?? false,
  });
}
