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
  signInWithGoogle: () => void;
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
      hydrateStore(cloud);
      hydrated.current = true;
    },
    [supabase, hydrateStore]
  );

  const saveCloudState = useCallback(async () => {
    if (!supabase || !user) return;
    await saveUserData(supabase, user.uid, pickCloudState());
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

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
    if (!user || !supabase) return;

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

  const signInWithGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  const signOut = async () => {
    if (!supabase) return;
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
      value={{
        user,
        loading,
        configError,
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
