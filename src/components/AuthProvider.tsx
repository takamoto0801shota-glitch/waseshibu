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
  clearOnboardingCache,
  clearSetupLock,
  hasSetupInfo,
  isCloudSetupLocked,
  isSetupLockedForUser,
  loadLocalStateBackup,
  lockSetupPermanently,
  saveLocalStateBackup,
} from "@/lib/onboardingGate";
import {
  authUserFromSupabase,
  defaultCloudState,
  enforceSetupLock,
  ensureUserRow,
  loadUserData,
  saveUserData,
  shouldPersistToCloud,
  verifySetupSaved,
  type SaveUserDataOptions,
  type SaveUserMeta,
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
  saveCloudState: (options?: SaveUserDataOptions) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userMeta(user: AuthUser): SaveUserMeta {
  return {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

function pickCloudState(): CloudAppState {
  const s = useAppStore.getState();
  return {
    setupLockedAt: s.setupLockedAt,
    profile: s.profile,
    todayMinutes: s.todayMinutes,
    todayRewardDesires: s.todayRewardDesires,
    todaySubjectIds: s.todaySubjectIds,
    plan: s.plan,
    dailyRecords: s.dailyRecords,
    currentBlock: s.currentBlock,
    sessionPhase: s.sessionPhase,
    remainingSeconds: s.remainingSeconds,
    isRunning: s.isRunning,
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
  const loadingRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = useMemo(
    () =>
      configError
        ? null
        : createClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey, configError]
  );

  const hydrateStore = useCallback((state: CloudAppState) => {
    const locked = enforceSetupLock(state);
    useAppStore.setState({
      setupLockedAt: locked.setupLockedAt ?? null,
      profile: locked.profile,
      todayMinutes: locked.todayMinutes,
      todayRewardDesires: locked.todayRewardDesires,
      todaySubjectIds: locked.todaySubjectIds,
      plan: locked.plan,
      dailyRecords: locked.dailyRecords,
      currentBlock: locked.currentBlock,
      sessionPhase: locked.sessionPhase,
      remainingSeconds:
        locked.remainingSeconds ??
        (locked.currentBlock
          ? locked.currentBlock.durationMinutes * 60
          : 0),
      isRunning: locked.isRunning ?? false,
    });
  }, []);

  const persistState = useCallback(
    async (uid: string, state: CloudAppState, repairCloud = false) => {
      const locked = enforceSetupLock(state);
      saveLocalStateBackup(uid, locked);
      if (isCloudSetupLocked(locked)) {
        lockSetupPermanently(uid);
      }
      if (repairCloud && supabase && shouldPersistToCloud(locked)) {
        await saveUserData(supabase, uid, locked).catch(() => {});
      }
    },
    [supabase]
  );

  const loadAndHydrate = useCallback(
    async (uid: string) => {
      if (!supabase || loadingRef.current) return;
      loadingRef.current = true;
      setDataReady(false);
      try {
        const backup = loadLocalStateBackup(uid);
        let cloud = await loadUserData(supabase, uid);

        if (cloud && !hasSetupInfo(cloud.profile) && backup && hasSetupInfo(backup.profile)) {
          cloud = enforceSetupLock(backup);
        } else if (!cloud && backup) {
          cloud = enforceSetupLock(backup);
        }
        if (!cloud || !hasSetupInfo(cloud.profile)) {
          await new Promise((r) => setTimeout(r, 400));
          const retry = await loadUserData(supabase, uid);
          if (retry && hasSetupInfo(retry.profile)) {
            cloud = retry;
          } else if (backup && hasSetupInfo(backup.profile)) {
            cloud = enforceSetupLock(backup);
          }
        }

        if (cloud) {
          const locked = enforceSetupLock(cloud);
          hydrateStore(locked);
          await persistState(uid, locked, true);
        } else if (isSetupLockedForUser(uid)) {
          const backup = loadLocalStateBackup(uid);
          if (backup) {
            hydrateStore(backup);
          } else {
            hydrateStore(defaultCloudState());
          }
        } else {
          hydrateStore(defaultCloudState());
        }

        hydrated.current = true;
        setDataReady(true);
      } finally {
        loadingRef.current = false;
      }
    },
    [supabase, hydrateStore, persistState]
  );

  const clearSaveTimer = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  const saveCloudState = useCallback(
    async (options?: SaveUserDataOptions) => {
      if (!supabase || !user) return;
      clearSaveTimer();
      const state = enforceSetupLock(pickCloudState());
      await saveUserData(
        supabase,
        user.uid,
        state,
        options,
        userMeta(user)
      );
      if (!options?.allowOnboardingReset) {
        await persistState(user.uid, state);
        if (hasSetupInfo(state.profile)) {
          const ok = await verifySetupSaved(supabase, user.uid);
          if (!ok) {
            throw new Error("学年・科目の保存を確認できませんでした");
          }
        }
      }
    },
    [supabase, user, persistState, clearSaveTimer]
  );

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
          setDataReady(false);
          await ensureUserRow(
            supabase,
            session.user as import("@supabase/supabase-js").User
          );
          await loadAndHydrate(authUser.uid);
        }
      } else if (event === "SIGNED_OUT") {
        const { data: { session: stillThere } } =
          await supabase.auth.getSession();
        if (stillThere?.user) return;

        clearSaveTimer();
        clearOnboardingCache();
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
        const state = enforceSetupLock(pickCloudState());
        if (!shouldPersistToCloud(state)) return;
        saveUserData(supabase, user.uid, state, undefined, userMeta(user)).catch(
          () => {}
        );
        void persistState(user.uid, state);
      }, 800);
    });

    return () => {
      unsub();
      clearSaveTimer();
    };
  }, [user, supabase, clearSaveTimer, persistState]);

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
    const uid = user?.uid;
    if (user) {
      await saveUserData(
        supabase,
        user.uid,
        pickCloudState(),
        undefined,
        userMeta(user)
      ).catch(() => {});
    }
    if (uid) clearSetupLock(uid);
    clearOnboardingCache();
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
