"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  authUserFromSupabase,
  ensureUserRow,
  loadUserData,
  saveUserData,
} from "@/lib/userData";
import { AuthUser, CloudAppState } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  configError: string | null;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

function getConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) {
    return "Supabase の環境変数が未設定です（Railway Variables を確認）";
  }
  if (url.includes("xxxxx") || url.includes("placeholder")) {
    return "NEXT_PUBLIC_SUPABASE_URL がプレースホルダーのままです。Supabase Dashboard の実際の URL に置き換えてください";
  }
  if (key.length < 100) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY が正しく設定されていません";
  }
  return null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function pickCloudState(): CloudAppState {
  const s = useAppStore.getState();
  return {
    profile: s.profile,
    todayMinutes: s.todayMinutes,
    todayRewardDesires: s.todayRewardDesires,
    todaySubjectIds: s.todaySubjectIds,
    plan: s.plan,
    dailyRecords: s.dailyRecords,
    currentBlock: s.currentBlock,
    sessionPhase: s.sessionPhase,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configError = getConfigError();
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const hydrateStore = useCallback((state: CloudAppState) => {
    useAppStore.setState({
      profile: state.profile,
      todayMinutes: state.todayMinutes,
      todayRewardDesires: state.todayRewardDesires,
      todaySubjectIds: state.todaySubjectIds,
      plan: state.plan,
      dailyRecords: state.dailyRecords,
      currentBlock: state.currentBlock,
      sessionPhase: state.sessionPhase,
      remainingSeconds: state.currentBlock
        ? state.currentBlock.durationMinutes * 60
        : 0,
      isRunning: false,
    });
  }, []);

  const loadAndHydrate = useCallback(
    async (uid: string) => {
      const cloud = await loadUserData(supabase, uid);
      hydrateStore(cloud);
      hydrated.current = true;
    },
    [supabase, hydrateStore]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser = authUserFromSupabase(session.user);
          setUser(authUser);
          await ensureUserRow(supabase, session.user);
          await loadAndHydrate(authUser.uid);
        }
      } finally {
        setLoading(false);
      }
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser = authUserFromSupabase(session.user);
        setUser(authUser);
        if (event === "SIGNED_IN" && !hydrated.current) {
          await ensureUserRow(supabase, session.user);
          await loadAndHydrate(authUser.uid);
        }
      } else {
        setUser(null);
        hydrated.current = false;
        useAppStore.getState().resetAll();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, loadAndHydrate]);

  useEffect(() => {
    if (!user) return;

    const unsub = useAppStore.subscribe(() => {
      if (!hydrated.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveUserData(supabase, user.uid, pickCloudState()).catch(() => {});
      }, 800);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [user, supabase]);

  const signInWithGoogle = async (): Promise<string | null> => {
    if (configError) return configError;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    if (user) {
      await saveUserData(supabase, user.uid, pickCloudState()).catch(
        () => {}
      );
    }
    hydrated.current = false;
    await supabase.auth.signOut();
    setUser(null);
    useAppStore.getState().resetAll();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, configError, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
