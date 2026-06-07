import type { UserProfile } from "@/lib/types";

const CACHE_KEY = "atlas_onboarding_done_uid";

/** プロフィールから初期設定完了を判定（フラグ欠落時も推論） */
export function inferOnboardingComplete(profile: UserProfile): boolean {
  if (profile.onboardingComplete) return true;
  return profile.grade !== "" && profile.subjects.length > 0;
}

export function isOnboardingDone(
  profile: UserProfile,
  uid?: string | null
): boolean {
  if (inferOnboardingComplete(profile)) return true;
  if (uid && isOnboardingCached(uid)) return true;
  return false;
}

export function markOnboardingCached(uid: string): void {
  try {
    sessionStorage.setItem(CACHE_KEY, uid);
  } catch {
    /* private mode 等 */
  }
}

export function isOnboardingCached(uid: string): boolean {
  try {
    return sessionStorage.getItem(CACHE_KEY) === uid;
  } catch {
    return false;
  }
}

export function clearOnboardingCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* noop */
  }
}

/** プロフィール更新時に onboardingComplete の誤リセットを防ぐ */
export function withStableProfile(
  current: UserProfile,
  patch: Partial<UserProfile>,
  options?: { allowOnboardingReset?: boolean }
): UserProfile {
  const next = { ...current, ...patch };
  if (options?.allowOnboardingReset) return next;
  if (current.onboardingComplete || inferOnboardingComplete(next)) {
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
