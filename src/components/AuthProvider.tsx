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
  shouldPersistToCloud,
  type SaveUserDataOptions,
} from "@/lib/userData";
import { fetchCloudWithRetry } from "@/lib/cloudFetch";
import { recoverSetupState } from "@/lib/recoverSetup";
import {
  mergeCloudWithBackup,
  persistSessionSnapshot,
  pickCloudStateFromStore,
} from "@/lib/sessionRestore";
import { applyCloudStateToStore } from "@/lib/storeHydrate";
import {
  ensureUserRowViaApi,
  fetchUserDataFromApi,
  saveUserDataViaApi,
  verifyApiSaveResponse,
} from "@/lib/userDataClient";
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

function pickCloudState(): CloudAppState {
  const s = useAppStore.getState();
  return {
    setupLockedAt: s.setupLockedAt,
    profile: s.profile,
    todayMinutes: s.todayMinutes,
    todayRewardMinutes: s.todayRewardMinutes,
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
  const hydratedUid = useRef<string | null>(null);
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
    applyCloudStateToStore(state);
  }, []);

  const persistLocal = useCallback((uid: string, state: CloudAppState) => {
    const locked = enforceSetupLock(state);
    saveLocalStateBackup(uid, locked);
    if (isCloudSetupLocked(locked)) {
      lockSetupPermanently(uid);
    }
  }, []);

  const syncToCloud = useCallback(
    async (state: CloudAppState, options?: SaveUserDataOptions) => {
      const locked = enforceSetupLock(state);
      const result = await saveUserDataViaApi(locked, options);
      if (!options?.allowOnboardingReset) {
        verifyApiSaveResponse(result, locked);
      }
      return locked;
    },
    []
  );

  const loadAndHydrate = useCallback(
    async (uid: string, options?: { silent?: boolean }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const isFirstLoad = !hydrated.current;
      if (isFirstLoad && !options?.silent) {
        setDataReady(false);
      }
      try {
        const backup = loadLocalStateBackup(uid);
        let cloud: CloudAppState | null = null;

        cloud = await fetchCloudWithRetry(3);

        if (cloud && !hasSetupInfo(cloud.profile) && backup && hasSetupInfo(backup.profile)) {
          cloud = enforceSetupLock(backup);
        } else if (!cloud && backup) {
          cloud = enforceSetupLock(backup);
        }
        if (!cloud || !hasSetupInfo(cloud.profile)) {
          const retry = await fetchCloudWithRetry(3, 500);
          if (retry && hasSetupInfo(retry.profile)) {
            cloud = retry;
          } else if (backup && hasSetupInfo(backup.profile)) {
            cloud = enforceSetupLock(backup);
          }
        }

        if (cloud) {
          const locked = enforceSetupLock(
            mergeCloudWithBackup(cloud, backup)
          );
          hydrateStore(locked);
          persistLocal(uid, locked);
          if (hasSetupInfo(locked.profile)) {
            try {
              const remote = await fetchUserDataFromApi();
              if (!remote || !hasSetupInfo(remote.profile)) {
                await syncToCloud(locked);
              }
            } catch {
              await syncToCloud(locked).catch(() => {});
            }
          }
        } else if (isSetupLockedForUser(uid)) {
          const recovered = await recoverSetupState(uid);
          if (!recovered) {
            hydrateStore(defaultCloudState());
          }
        } else {
          hydrateStore(defaultCloudState());
        }

        hydrated.current = true;
        hydratedUid.current = uid;
        setDataReady(true);
      } finally {
        loadingRef.current = false;
      }
    },
    [hydrateStore, persistLocal, syncToCloud]
  );

  const clearSaveTimer = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  const saveCloudState = useCallback(
    async (options?: SaveUserDataOptions) => {
      if (!user) return;
      clearSaveTimer();
      const state = enforceSetupLock(pickCloudState());
      await syncToCloud(state, options);
      if (!options?.allowOnboardingReset) {
        persistLocal(user.uid, state);
      }
    },
    [user, persistLocal, clearSaveTimer, syncToCloud]
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

        const alreadyHydratedForUser =
          hydrated.current && hydratedUid.current === authUser.uid;

        const shouldLoad =
          !alreadyHydratedForUser &&
          (event === "INITIAL_SESSION" || event === "SIGNED_IN");

        if (shouldLoad) {
          await ensureUserRowViaApi().catch(() => {});
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
        hydratedUid.current = null;
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
    if (!user) return;

    const unsub = useAppStore.subscribe((state, prev) => {
      if (!hydrated.current) return;

      const sessionChanged =
        state.plan !== prev.plan ||
        state.currentBlock !== prev.currentBlock ||
        state.sessionPhase !== prev.sessionPhase ||
        state.remainingSeconds !== prev.remainingSeconds ||
        state.isRunning !== prev.isRunning;

      if (sessionChanged) {
        persistSessionSnapshot(user.uid);
      }

      clearSaveTimer();
      saveTimer.current = setTimeout(() => {
        const cloudState = enforceSetupLock(pickCloudStateFromStore());
        if (!shouldPersistToCloud(cloudState)) return;
        saveUserDataViaApi(cloudState).catch(() => {});
        persistLocal(user.uid, cloudState);
      }, 800);
    });

    return () => {
      unsub();
      clearSaveTimer();
    };
  }, [user, clearSaveTimer, persistLocal]);

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
      await saveUserDataViaApi(pickCloudState()).catch(() => {});
    }
    if (uid) clearSetupLock(uid);
    clearOnboardingCache();
    hydrated.current = false;
    hydratedUid.current = null;
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
