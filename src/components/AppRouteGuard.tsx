"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isMainAppPath, isOnboardingDone } from "@/lib/onboardingGate";
import { useAppStore } from "@/store/useAppStore";

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const ONBOARDING_PATH = "/onboarding";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * 認証・初期設定の遷移を一箇所で制御する。
 * 各ページ個別の replace より先に dataReady を待ち、完了済みユーザーの誤リダイレクトを防ぐ。
 */
export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, dataReady } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const lastDoneRef = useRef(false);

  const onboardingDone = user
    ? isOnboardingDone(profile, user.uid)
    : false;

  if (onboardingDone) {
    lastDoneRef.current = true;
  }

  useEffect(() => {
    if (loading || !dataReady) return;
    if (isPublicPath(pathname)) return;

    if (!user) return;

    const forceOnboarding = searchParams.get("force") === "1";
    const onOnboarding = pathname.startsWith(ONBOARDING_PATH);
    const onLegacyHome = pathname === "/home";

    // 完了済みなのに一瞬 false になった場合はリダイレクトしない（ちらつき防止）
    const effectivelyDone = onboardingDone || lastDoneRef.current;

    if (onLegacyHome) {
      router.replace("/");
      return;
    }

    if (!effectivelyDone && !onOnboarding && isMainAppPath(pathname)) {
      router.replace(ONBOARDING_PATH);
      return;
    }

    if (effectivelyDone && onOnboarding && !forceOnboarding) {
      router.replace("/");
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
