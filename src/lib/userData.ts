import { SupabaseClient, User } from "@supabase/supabase-js";
import { DESIRE_PRESETS } from "@/lib/desires";
import { filterSubjects } from "@/lib/exclusions";
import {
  inferOnboardingComplete,
  isCloudSetupLocked,
  mergeLockedProfile,
} from "@/lib/onboardingGate";
import { normalizeMode } from "@/lib/rhythmCoach";
import { sanitizeSubjects } from "@/lib/subjectUtils";
import {
  AuthUser,
  CloudAppState,
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
    todayMinutes: 150,
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
    todayMinutes: raw.todayMinutes ?? 150,
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
    await supabase.from("user_data").insert({
      uid: authUser.uid,
      email: authUser.email,
      display_name: authUser.displayName,
      photo_url: authUser.photoURL,
      app_state: defaultCloudState(),
    });
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

  if (error || !data?.app_state) return null;
  return enforceSetupLock(data.app_state as CloudAppState);
}

export async function saveUserData(
  supabase: SupabaseClient,
  uid: string,
  state: CloudAppState,
  options?: SaveUserDataOptions
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_data")
    .select("app_state")
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

  const { error } = await supabase
    .from("user_data")
    .update({ app_state: toSave, updated_at: new Date().toISOString() })
    .eq("uid", uid);

  if (error) throw new Error(error.message);
}
