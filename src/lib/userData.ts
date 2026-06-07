import { SupabaseClient, User } from "@supabase/supabase-js";
import { DESIRE_PRESETS } from "@/lib/desires";
import { filterSubjects } from "@/lib/exclusions";
import {
  hasSetupInfo,
  inferOnboardingComplete,
  isCloudSetupLocked,
  mergeLockedProfile,
} from "@/lib/onboardingGate";
import { normalizeMode } from "@/lib/rhythmCoach";
import { sanitizeSubjects } from "@/lib/subjectUtils";
import {
  AuthUser,
  CloudAppState,
  DEFAULT_REWARD_MINUTES,
  DEFAULT_STUDY_MINUTES,
  defaultRewardMinutesFromStudy,
  UserDesire,
  UserProfile,
} from "@/lib/types";

function defaultDesires(): UserDesire[] {
  return DESIRE_PRESETS.slice(0, 3).map((d) => ({
    id: d.id,
    label: d.label,
  }));
}

export function defaultProfile(): UserProfile {
  return {
    grade: "",
    courseTrack: "arts",
    desires: defaultDesires(),
    subjects: [],
    testDate: "",
    mode: "self_study",
    onboardingComplete: false,
  };
}

export function defaultCloudState(): CloudAppState {
  return {
    setupLockedAt: null,
    profile: defaultProfile(),
    todayMinutes: DEFAULT_STUDY_MINUTES,
    todayRewardMinutes: DEFAULT_REWARD_MINUTES,
    todayRewardDesires: [],
    todaySubjectIds: [],
    plan: null,
    dailyRecords: [],
    currentBlock: null,
    sessionPhase: null,
    remainingSeconds: 0,
    isRunning: false,
  };
}

export function authUserFromSupabase(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    uid: user.id,
    email: user.email ?? "",
    displayName:
      meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "ユーザー",
    photoURL: meta.avatar_url ?? meta.picture ?? null,
  };
}

/** 初期設定完了を永久ロック状態に正規化 */
export function enforceSetupLock(state: CloudAppState): CloudAppState {
  const normalized = normalizeCloudState(state);
  if (!isCloudSetupLocked(normalized)) return normalized;

  return {
    ...normalized,
    setupLockedAt: normalized.setupLockedAt ?? new Date().toISOString(),
    profile: { ...normalized.profile, onboardingComplete: true },
  };
}

export function normalizeCloudState(raw: CloudAppState): CloudAppState {
  const profile = { ...defaultProfile(), ...raw.profile };
  profile.mode = normalizeMode(profile.mode);
  if (!profile.courseTrack) profile.courseTrack = "arts";
  if (!profile.desires?.length) profile.desires = defaultDesires();
  profile.subjects = filterSubjects(sanitizeSubjects(profile.subjects ?? []));
  if (raw.setupLockedAt || inferOnboardingComplete(profile)) {
    profile.onboardingComplete = true;
  } else {
    profile.onboardingComplete = inferOnboardingComplete(profile);
  }
  const validIds = new Set(profile.subjects.map((s) => s.id));
  const todaySubjectIds = (raw.todaySubjectIds ?? []).filter((id) =>
    validIds.has(id)
  );
  let plan = raw.plan ?? null;
  if (plan && "blocks" in (plan as object)) plan = null;

  return {
    setupLockedAt: raw.setupLockedAt ?? null,
    profile,
    todayMinutes: raw.todayMinutes ?? DEFAULT_STUDY_MINUTES,
    todayRewardMinutes: (() => {
      if (raw.todayRewardMinutes != null) return raw.todayRewardMinutes;
      const study = raw.todayMinutes ?? DEFAULT_STUDY_MINUTES;
      return defaultRewardMinutesFromStudy(study);
    })(),
    todayRewardDesires: raw.todayRewardDesires ?? [],
    todaySubjectIds,
    plan,
    dailyRecords: raw.dailyRecords ?? [],
    currentBlock: raw.currentBlock ?? null,
    sessionPhase: raw.sessionPhase ?? null,
    remainingSeconds: raw.remainingSeconds ?? 0,
    isRunning: raw.isRunning ?? false,
  };
}

export interface SaveUserDataOptions {
  /** マイページ「初回設定をやり直す」時のみ true */
  allowOnboardingReset?: boolean;
}

export interface SaveUserMeta {
  email: string;
  displayName: string;
  photoURL: string | null;
}

/** 空のプロフィールをクラウドへ書き込む必要があるか */
export function shouldPersistToCloud(state: CloudAppState): boolean {
  return !!state.setupLockedAt || hasSetupInfo(state.profile);
}

export async function ensureUserRow(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const authUser = authUserFromSupabase(user);
  const { data } = await supabase
    .from("user_data")
    .select("uid")
    .eq("uid", authUser.uid)
    .maybeSingle();

  if (!data) {
    const { error } = await supabase.from("user_data").insert({
      uid: authUser.uid,
      email: authUser.email,
      display_name: authUser.displayName,
      photo_url: authUser.photoURL,
      app_state: defaultCloudState(),
    });
    if (error) throw new Error(error.message);
  } else {
    await supabase
      .from("user_data")
      .update({
        email: authUser.email,
        display_name: authUser.displayName,
        photo_url: authUser.photoURL,
      })
      .eq("uid", authUser.uid);
  }
}

export async function loadUserData(
  supabase: SupabaseClient,
  uid: string
): Promise<CloudAppState | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("app_state")
    .eq("uid", uid)
    .maybeSingle();

  if (error || !data) return null;
  const raw = data.app_state as CloudAppState | null | undefined;
  if (!raw || typeof raw !== "object") return null;
  return enforceSetupLock(raw);
}

export async function saveUserData(
  supabase: SupabaseClient,
  uid: string,
  state: CloudAppState,
  options?: SaveUserDataOptions,
  meta?: SaveUserMeta
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_data")
    .select("app_state, email, display_name, photo_url")
    .eq("uid", uid)
    .maybeSingle();

  const prev = existing?.app_state as CloudAppState | undefined;
  const prevLocked =
    !!prev?.setupLockedAt ||
    !!prev?.profile?.onboardingComplete ||
    inferOnboardingComplete(prev?.profile ?? defaultProfile());

  let toSave = enforceSetupLock(normalizeCloudState(state));

  if (!options?.allowOnboardingReset && prevLocked) {
    toSave = enforceSetupLock({
      ...toSave,
      setupLockedAt: prev?.setupLockedAt ?? toSave.setupLockedAt,
      profile: mergeLockedProfile(prev?.profile, toSave.profile),
    });
  }

  if (options?.allowOnboardingReset) {
    toSave = {
      ...toSave,
      setupLockedAt: null,
      profile: { ...toSave.profile, onboardingComplete: false },
    };
  }

  const row = {
    uid,
    email: meta?.email ?? existing?.email ?? "",
    display_name: meta?.displayName ?? existing?.display_name ?? "",
    photo_url: meta?.photoURL ?? existing?.photo_url ?? null,
    app_state: toSave,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_data")
    .upsert(row, { onConflict: "uid" });

  if (error) throw new Error(error.message);
}

/** 保存後に学年・科目がクラウドに反映されたか確認 */
export async function verifySetupSaved(
  supabase: SupabaseClient,
  uid: string
): Promise<boolean> {
  const loaded = await loadUserData(supabase, uid);
  return !!loaded && hasSetupInfo(loaded.profile);
}
