"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  hasSetupInfo,
  HOME_PATH,
  ONBOARDING_PATH,
} from "@/lib/onboardingGate";
import { useAppStore } from "@/store/useAppStore";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * ログイン後は常にホーム（/home）が起点。
 * 学年・科目がない場合の初期設定への誘導はホーム画面が行う。
 * ここでは「設定済みなのに初期設定へ入る」ケースのみ弾く。
 */
export function AppRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading, dataReady } = useAuth();
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    if (loading || !dataReady) return;
    if (isPublicPath(pathname)) return;
    if (!user) return;

    const forceReset = searchParams.get("force") === "1";
    const onOnboarding = pathname.startsWith(ONBOARDING_PATH);

    if (onOnboarding && hasSetupInfo(profile) && !forceReset) {
      router.replace(HOME_PATH);
    }
  }, [loading, dataReady, user, pathname, profile, router, searchParams]);

  return <>{children}</>;
}
