import { GRADE_OPTIONS, normalizeGrade } from "@/lib/grades";
import type { CloudAppState, SubjectConfig, UserProfile } from "@/lib/types";

const SESSION_KEY = "atlas_onboarding_done_uid";
const LOCK_PREFIX = "atlas_setup_locked_v1_";
const BACKUP_PREFIX = "atlas_state_backup_v1_";

export const HOME_PATH = "/home";
export const ONBOARDING_PATH = "/onboarding";

/** 学年が選択済みか（例: 中学2年） */
export function hasValidGrade(grade: string): boolean {
  const normalized = normalizeGrade(grade);
  return (GRADE_OPTIONS as readonly string[]).includes(normalized);
}

/** 科目が1つ以上あるか（例: 数学） */
export function hasValidSubjects(subjects: SubjectConfig[]): boolean {
  return subjects.some((s) => s.name.trim() !== "");
}

/**
 * 初期設定が完了しているか（ルーティング判定用）。
 * 学年（中学2年など）と科目（数学など）の両方が必要。
 */
export function hasSetupInfo(profile: UserProfile): boolean {
  return hasValidGrade(profile.grade) && hasValidSubjects(profile.subjects);
}

/** ホーム到着後に初期設定画面へ誘導すべきか */
export function needsInitialSetup(profile: UserProfile): boolean {
  return !hasSetupInfo(profile);
}

/** プロフィールから初期設定完了を推論（学年・科目が揃っている場合のみ） */
export function inferOnboardingComplete(profile: UserProfile): boolean {
  return hasSetupInfo(profile);
}

/** クラウド状態から初期設定がロック済みか */
export function isCloudSetupLocked(state: CloudAppState): boolean {
  if (!hasSetupInfo(state.profile)) return false;
  return !!state.setupLockedAt || state.profile.onboardingComplete;
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

/** ガード対象のメイン画面パス */
export const MAIN_APP_PATHS = [
  HOME_PATH,
  "/mypage",
  "/menu",
  "/session",
  "/complete",
] as const;

export function isMainAppPath(pathname: string): boolean {
  return MAIN_APP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
