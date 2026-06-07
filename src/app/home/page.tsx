"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 旧URL互換: /home → / */
export default function HomeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="text-sm text-muted">移動中...</p>
    </div>
  );
}
