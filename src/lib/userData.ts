import { SupabaseClient, User } from "@supabase/supabase-js";
import { DESIRE_PRESETS } from "@/lib/desires";
import { filterSubjects } from "@/lib/exclusions";
import { buildAllSubjects } from "@/lib/subjectCatalog";
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

const DEFAULT_GRADE = "高校2年";

/** Googleログイン直後にホームへ行ける初期状態 */
export function buildReadyCloudState(): CloudAppState {
  const subjects = buildAllSubjects(DEFAULT_GRADE, "arts");
  return {
    profile: {
      grade: DEFAULT_GRADE,
      courseTrack: "arts",
      desires: defaultDesires(),
      subjects,
      testDate: "",
      mode: "self_study",
      onboardingComplete: true,
    },
    todayMinutes: 150,
    todayRewardDesires: [],
    todaySubjectIds: subjects.map((s) => s.id),
    plan: null,
    dailyRecords: [],
    currentBlock: null,
    sessionPhase: null,
  };
}

export function defaultCloudState(): CloudAppState {
  return buildReadyCloudState();
}

/** 未完了の初期設定をスキップしてホーム利用可能にする */
export function ensureReadyProfile(state: CloudAppState): CloudAppState {
  const normalized = normalizeCloudState(state);
  if (normalized.profile.onboardingComplete) return normalized;

  const ready = buildReadyCloudState();
  const subjects =
    normalized.profile.subjects.length > 0
      ? normalized.profile.subjects
      : ready.profile.subjects;
  const grade = normalized.profile.grade || ready.profile.grade;

  return normalizeCloudState({
    ...normalized,
    profile: {
      ...normalized.profile,
      grade,
      subjects,
      desires:
        normalized.profile.desires.length > 0
          ? normalized.profile.desires
          : ready.profile.desires,
      onboardingComplete: true,
    },
    todaySubjectIds:
      normalized.todaySubjectIds.length > 0
        ? normalized.todaySubjectIds
        : subjects.map((s) => s.id),
  });
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

  if (error || !data?.app_state) return buildReadyCloudState();
  return ensureReadyProfile(data.app_state as CloudAppState);
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
