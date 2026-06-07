import type { CloudAppState, UserProfile } from "@/lib/types";

const SESSION_KEY = "atlas_onboarding_done_uid";
const LOCK_PREFIX = "atlas_setup_locked_v1_";
const BACKUP_PREFIX = "atlas_state_backup_v1_";

/** プロフィールから初期設定完了を推論 */
export function inferOnboardingComplete(profile: UserProfile): boolean {
  if (profile.onboardingComplete) return true;
  return profile.grade !== "" && profile.subjects.length > 0;
}

/** クラウド状態から初期設定がロック済みか */
export function isCloudSetupLocked(state: CloudAppState): boolean {
  if (state.setupLockedAt) return true;
  return inferOnboardingComplete(state.profile);
}

/** localStorage に永久ロック済みか（プロフィール読込前でも判定可能） */
export function isSetupLockedForUser(uid: string): boolean {
  try {
    return localStorage.getItem(`${LOCK_PREFIX}${uid}`) === "1";
  } catch {
    return false;
  }
}

export function isOnboardingDone(
  profile: UserProfile,
  uid?: string | null,
  setupLockedAt?: string | null
): boolean {
  if (setupLockedAt) return true;
  if (inferOnboardingComplete(profile)) return true;
  if (uid && isSetupLockedForUser(uid)) return true;
  if (uid && isOnboardingCached(uid)) return true;
  return false;
}

/** 初期設定完了を永久ロック（ブラウザ再起動・再検索後も維持） */
export function lockSetupPermanently(uid: string): void {
  try {
    localStorage.setItem(`${LOCK_PREFIX}${uid}`, "1");
    sessionStorage.setItem(SESSION_KEY, uid);
  } catch {
    /* private mode 等 */
  }
}

export function markOnboardingCached(uid: string): void {
  lockSetupPermanently(uid);
}

export function isOnboardingCached(uid: string): boolean {
  if (isSetupLockedForUser(uid)) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === uid;
  } catch {
    return false;
  }
}

/** マイページ「初回設定をやり直す」時のみ呼ぶ */
export function clearSetupLock(uid: string): void {
  try {
    localStorage.removeItem(`${LOCK_PREFIX}${uid}`);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(`${BACKUP_PREFIX}${uid}`);
  } catch {
    /* noop */
  }
}

export function clearOnboardingCache(): void {
  /* signOut 時: uid 不明なので全ロック・バックアップを掃除しない（per-uid で clearSetupLock を使う） */
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function saveLocalStateBackup(uid: string, state: CloudAppState): void {
  try {
    localStorage.setItem(`${BACKUP_PREFIX}${uid}`, JSON.stringify(state));
  } catch {
    /* quota 等 */
  }
}

export function loadLocalStateBackup(uid: string): CloudAppState | null {
  try {
    const raw = localStorage.getItem(`${BACKUP_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as CloudAppState;
  } catch {
    return null;
  }
}

/** ロック済みユーザーのプロフィールを空データで上書きしない */
export function mergeLockedProfile(
  prev: UserProfile | undefined,
  next: UserProfile
): UserProfile {
  if (!prev) return { ...next, onboardingComplete: true };
  const locked = inferOnboardingComplete(prev) || prev.onboardingComplete;
  if (!locked) return next;

  return {
    ...prev,
    ...next,
    grade: next.grade || prev.grade,
    subjects: next.subjects.length > 0 ? next.subjects : prev.subjects,
    desires: next.desires.length > 0 ? next.desires : prev.desires,
    courseTrack: next.courseTrack || prev.courseTrack,
    onboardingComplete: true,
  };
}

/** プロフィール更新時に onboardingComplete の誤リセットを防ぐ */
export function withStableProfile(
  current: UserProfile,
  patch: Partial<UserProfile>,
  options?: { allowOnboardingReset?: boolean }
): UserProfile {
  const next = { ...current, ...patch };
  if (options?.allowOnboardingReset) return next;
  if (
    current.onboardingComplete ||
    inferOnboardingComplete(current) ||
    inferOnboardingComplete(next)
  ) {
    next.onboardingComplete = true;
  }
  return next;
}

/** ガード対象のメイン画面パス（ホームは `/`） */
export const MAIN_APP_PATHS = [
  "/",
  "/mypage",
  "/menu",
  "/session",
  "/complete",
] as const;

export function isMainAppPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MAIN_APP_PATHS.filter((p) => p !== "/").some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
