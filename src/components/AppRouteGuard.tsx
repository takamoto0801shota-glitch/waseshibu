"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  isMainAppPath,
  isOnboardingDone,
  isSetupLockedForUser,
} from "@/lib/onboardingGate";
import { useAppStore } from "@/store/useAppStore";

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const ONBOARDING_PATH = "/onboarding";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * 初期設定完了ユーザーは永久にメイン画面のみ許可。
 * オンボーディングへ戻すのはマイページ「やり直す」（?force=1）のみ。
 */
export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, dataReady } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const setupLockedAt = useAppStore((s) => s.setupLockedAt);

  const uid = user?.uid;
  const permanentlyLocked = uid ? isSetupLockedForUser(uid) : false;
  const onboardingDone =
    permanentlyLocked ||
    (uid
      ? isOnboardingDone(profile, uid, setupLockedAt)
      : false);

  useEffect(() => {
    if (loading || !dataReady) return;
    if (isPublicPath(pathname)) return;
    if (!user) return;

    const forceReset = searchParams.get("force") === "1";
    const onOnboarding = pathname.startsWith(ONBOARDING_PATH);
    const onLegacyHome = pathname === "/home";

    if (onLegacyHome) {
      router.replace("/");
      return;
    }

    // ロック済み・完了済み → 初期設定画面へは絶対に戻さない（明示リセット時のみ）
    if (onboardingDone && onOnboarding && !forceReset) {
      router.replace("/");
      return;
    }

    if (!onboardingDone && !onOnboarding && isMainAppPath(pathname)) {
      router.replace(ONBOARDING_PATH);
    }
  }, [
    loading,
    dataReady,
    user,
    pathname,
    onboardingDone,
    router,
    searchParams,
  ]);

  return <>{children}</>;
}
