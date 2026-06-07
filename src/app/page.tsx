"use client";

import { useAuth } from "@/components/AuthProvider";

/** `/` はハブ。AppRouteGuard が /home または /onboarding へ振り分ける */
export default function RootHubPage() {
  const { loading, dataReady } = useAuth();

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="text-sm text-muted">
        {loading || !dataReady ? "読み込み中..." : "移動中..."}
      </p>
    </div>
  );
}
