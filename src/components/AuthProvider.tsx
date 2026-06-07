"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { validateSupabaseConfig } from "@/lib/supabase/env";
import {
  authUserFromSupabase,
  defaultCloudState,
  ensureUserRow,
  loadUserData,
  saveUserData,
} from "@/lib/userData";
import { AuthUser, CloudAppState } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  dataReady: boolean;
  configError: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  saveCloudState: () => Promise<void>;
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

interface AuthProviderProps {
  children: React.ReactNode;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function AuthProvider({
  children,
  supabaseUrl,
  supabaseAnonKey,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const configError = validateSupabaseConfig(supabaseUrl, supabaseAnonKey);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = useMemo(
    () =>
      configError
        ? null
        : createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey, configError]
  );

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
      if (!supabase) return;
      const cloud = await loadUserData(supabase, uid);
      hydrateStore(cloud ?? defaultCloudState());
      hydrated.current = true;
      setDataReady(true);
    },
    [supabase, hydrateStore]
  );

  const clearSaveTimer = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  const saveCloudState = useCallback(async () => {
    if (!supabase || !user) return;
    await saveUserData(supabase, user.uid, pickCloudState());
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setDataReady(true);
      return;
    }

    let mounted = true;

    const handleSession = async (
      event: string,
      session: { user: { id: string } } | null
    ) => {
      if (!mounted) return;

      if (session?.user) {
        const authUser = authUserFromSupabase(
          session.user as import("@supabase/supabase-js").User
        );
        setUser(authUser);

        const shouldLoad =
          !hydrated.current &&
          (event === "INITIAL_SESSION" || event === "SIGNED_IN");

        if (shouldLoad) {
          await ensureUserRow(
            supabase,
            session.user as import("@supabase/supabase-js").User
          );
          await loadAndHydrate(authUser.uid);
        }
      } else if (event === "SIGNED_OUT") {
        clearSaveTimer();
        setUser(null);
        hydrated.current = false;
        setDataReady(false);
        useAppStore.getState().resetAll();
        setDataReady(true);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleSession(event, session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user && !hydrated.current) {
        void handleSession("INITIAL_SESSION", session);
      }
      setLoading(false);
      if (!session?.user) {
        setDataReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearSaveTimer();
    };
  }, [supabase, loadAndHydrate, clearSaveTimer]);

  useEffect(() => {
    if (!user || !supabase) return;

    const unsub = useAppStore.subscribe(() => {
      if (!hydrated.current) return;
      clearSaveTimer();
      saveTimer.current = setTimeout(() => {
        saveUserData(supabase, user.uid, pickCloudState()).catch(() => {});
      }, 800);
    });

    return () => {
      unsub();
      clearSaveTimer();
    };
  }, [user, supabase, clearSaveTimer]);

  const signInWithGoogle = async (): Promise<string | null> => {
    if (!supabase) return configError ?? "Supabase が未設定です";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error) return error.message;
    if (!data.url) return "Googleログイン URL の取得に失敗しました";
    window.location.href = data.url;
    return null;
  };

  const signOut = async () => {
    if (!supabase) return;
    clearSaveTimer();
    if (user) {
      await saveUserData(supabase, user.uid, pickCloudState()).catch(
        () => {}
      );
    }
    hydrated.current = false;
    setDataReady(false);
    await supabase.auth.signOut();
    setUser(null);
    useAppStore.getState().resetAll();
    setDataReady(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dataReady,
        configError,
        supabaseUrl,
        supabaseAnonKey,
        signInWithGoogle,
        signOut,
        saveCloudState,
      }}
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
