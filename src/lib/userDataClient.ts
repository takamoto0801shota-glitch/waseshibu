import { hasSetupInfo } from "@/lib/onboardingGate";
import { enforceSetupLock } from "@/lib/userData";
import { CloudAppState } from "@/lib/types";
import type { SaveUserDataOptions } from "@/lib/userData";

interface UserDataResponse {
  state: CloudAppState | null;
  hasSetup?: boolean;
  grade?: string;
  subjectCount?: number;
  error?: string;
}

interface SaveResponse extends UserDataResponse {
  ok?: boolean;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

/** サーバー API 経由でクラウド読込（Cookie 認証） */
export async function fetchUserDataFromApi(): Promise<CloudAppState | null> {
  const res = await fetch("/api/user-data", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJson<UserDataResponse>(res);
  if (!data.state) return null;
  return enforceSetupLock(data.state);
}

/** サーバー API 経由でクラウド保存（Cookie 認証） */
export async function saveUserDataViaApi(
  state: CloudAppState,
  options?: SaveUserDataOptions
): Promise<SaveResponse> {
  const res = await fetch("/api/user-data", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state,
      allowOnboardingReset: options?.allowOnboardingReset,
    }),
  });
  const data = await parseJson<SaveResponse>(res);
  return data;
}

export async function ensureUserRowViaApi(): Promise<void> {
  const res = await fetch("/api/auth/setup", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "ユーザーデータの初期化に失敗しました");
  }
}

export function verifyApiSaveResponse(
  data: SaveResponse,
  state: CloudAppState
): void {
  if (state.profile.grade && state.profile.subjects.length > 0) {
    if (!data.hasSetup && !(data.state && hasSetupInfo(data.state.profile))) {
      throw new Error(
        `学年・科目の保存を確認できませんでした（grade=${data.grade ?? ""}, subjects=${data.subjectCount ?? 0}）`
      );
    }
  }
}
