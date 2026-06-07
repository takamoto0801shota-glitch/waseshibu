"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { tryRestoreSessionFromBackup } from "@/lib/sessionRestore";
import { useAppStore } from "@/store/useAppStore";

/**
 * plan が無いとき即リダイレクトせず、バックアップ復元を試してから遷移する。
 */
export function useRequirePlan(redirectTo: string): boolean {
  const router = useRouter();
  const { user } = useAuth();
  const plan = useAppStore((s) => s.plan);
  const [settled, setSettled] = useState(!!plan);

  useEffect(() => {
    if (plan) {
      setSettled(true);
      return;
    }

    setSettled(false);
    if (!user) return;

    if (tryRestoreSessionFromBackup(user.uid)) {
      setSettled(true);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!useAppStore.getState().plan) {
        router.replace(redirectTo);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [plan, user, router, redirectTo]);

  return settled && !!plan;
}
