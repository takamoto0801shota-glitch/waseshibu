"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-bg flex items-center justify-center">
          <p className="text-sm text-muted">ログイン中...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabaseUrl, supabaseAnonKey, configError } = useAuth();
  const [done, setDone] = useState(false);
  const exchanging = useRef(false);

  const supabase = useMemo(
    () =>
      configError ? null : createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey, configError]
  );

  useEffect(() => {
    if (configError) {
      router.replace("/login?error=config");
    }
  }, [configError, router]);

  useEffect(() => {
    if (done || exchanging.current || !supabase) return;

    const run = async () => {
      exchanging.current = true;

      const oauthError =
        searchParams.get("error_description") ?? searchParams.get("error");
      if (oauthError) {
        router.replace(
          `/login?error=auth&message=${encodeURIComponent(oauthError)}`
        );
        return;
      }

      const code = searchParams.get("code");
      if (!code) {
        router.replace("/login?error=auth");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        router.replace(
          `/login?error=auth&message=${encodeURIComponent(error.message)}`
        );
        return;
      }

      await fetch("/api/auth/setup", { method: "POST" }).catch(() => {});

      setDone(true);
      router.replace("/");
    };

    run();
  }, [done, supabase, searchParams, router]);

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="text-sm text-muted">ログイン中...</p>
    </div>
  );
}
