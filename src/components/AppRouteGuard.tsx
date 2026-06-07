"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { hasSetupInfo } from "@/lib/onboardingGate";
import { useAppStore } from "@/store/useAppStore";

const PUBLIC_PATHS = ["/login", "/auth/callback"];
const ONBOARDING_PATH = "/onboarding";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * ログイン後のスタートは常にホーム（/）。
 * 初期設定への誘導はホーム画面がデータを確認して行う。
 * ここでは「設定済みなのにオンボーディングへ入る」ケースのみ弾く。
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

    if (pathname === "/home") {
      router.replace("/");
      return;
    }

    if (onOnboarding && hasSetupInfo(profile) && !forceReset) {
      router.replace("/");
    }
  }, [loading, dataReady, user, pathname, profile, router, searchParams]);

  return <>{children}</>;
}
