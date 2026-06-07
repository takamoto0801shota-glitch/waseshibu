"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HOME_PATH } from "@/lib/onboardingGate";

/** ルート `/` はホームへ転送 */
export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(HOME_PATH);
  }, [router]);

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="text-sm text-muted">移動中...</p>
    </div>
  );
}
