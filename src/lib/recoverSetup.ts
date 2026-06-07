import { fetchCloudWithRetry } from "@/lib/cloudFetch";
import {
  hasSetupInfo,
  isCloudSetupLocked,
  isSetupLockedForUser,
  loadLocalStateBackup,
  lockSetupPermanently,
} from "@/lib/onboardingGate";
import { enforceSetupLock } from "@/lib/userData";
import {
  mergeSetupProfileIntoStore,
  persistSessionSnapshot,
  pickCloudStateFromStore,
} from "@/lib/sessionRestore";
import { CloudAppState } from "@/lib/types";

function persistRecovered(uid: string, state: CloudAppState): void {
  mergeSetupProfileIntoStore(state);
  persistSessionSnapshot(uid);
  const locked = enforceSetupLock(pickCloudStateFromStore());
  if (isCloudSetupLocked(locked)) {
    lockSetupPermanently(uid);
  }
}

/**
 * 設定済みユーザーの学年・科目をローカル／クラウドから復旧する。
 * 復旧できたら true。
 */
export async function recoverSetupState(uid: string): Promise<boolean> {
  const backup = loadLocalStateBackup(uid);
  if (backup && hasSetupInfo(backup.profile)) {
    persistRecovered(uid, backup);
    return true;
  }

  const cloud = await fetchCloudWithRetry(isSetupLockedForUser(uid) ? 5 : 3);
  if (cloud && hasSetupInfo(cloud.profile)) {
    persistRecovered(uid, cloud);
    return true;
  }

  return false;
}
