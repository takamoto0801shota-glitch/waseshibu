import { SupabaseClient, User } from "@supabase/supabase-js";
import { DESIRE_PRESETS } from "@/lib/desires";
import { filterSubjects } from "@/lib/exclusions";
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
    profile: defaultProfile(),
    todayMinutes: 150,
    todayRewardDesires: [],
    todaySubjectIds: [],
    plan: null,
    dailyRecords: [],
    currentBlock: null,
    sessionPhase: null,
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

export function normalizeCloudState(raw: CloudAppState): CloudAppState {
  const profile = { ...defaultProfile(), ...raw.profile };
  profile.mode = normalizeMode(profile.mode);
  if (!profile.courseTrack) profile.courseTrack = "arts";
  if (!profile.desires?.length) profile.desires = defaultDesires();
  profile.subjects = filterSubjects(sanitizeSubjects(profile.subjects ?? []));
  const validIds = new Set(profile.subjects.map((s) => s.id));
  const todaySubjectIds = (raw.todaySubjectIds ?? []).filter((id) =>
    validIds.has(id)
  );
  let plan = raw.plan ?? null;
  if (plan && "blocks" in (plan as object)) plan = null;

  return {
    profile,
    todayMinutes: raw.todayMinutes ?? 150,
    todayRewardDesires: raw.todayRewardDesires ?? [],
    todaySubjectIds,
    plan,
    dailyRecords: raw.dailyRecords ?? [],
    currentBlock: raw.currentBlock ?? null,
    sessionPhase: raw.sessionPhase ?? null,
  };
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
): Promise<CloudAppState> {
  const { data, error } = await supabase
    .from("user_data")
    .select("app_state")
    .eq("uid", uid)
    .single();

  if (error || !data?.app_state) return defaultCloudState();
  return normalizeCloudState(data.app_state as CloudAppState);
}

export async function saveUserData(
  supabase: SupabaseClient,
  uid: string,
  state: CloudAppState
): Promise<void> {
  await supabase
    .from("user_data")
    .update({ app_state: state, updated_at: new Date().toISOString() })
    .eq("uid", uid);
}
