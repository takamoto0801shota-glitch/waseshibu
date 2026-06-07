import { NextRequest, NextResponse } from "next/server";
import { hasSetupInfo } from "@/lib/onboardingGate";
import {
  authUserFromSupabase,
  loadUserData,
  saveUserData,
  type SaveUserDataOptions,
} from "@/lib/userData";
import { CloudAppState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

function setupSummary(state: CloudAppState | null) {
  if (!state) {
    return { hasSetup: false, grade: "", subjectCount: 0 };
  }
  return {
    hasSetup: hasSetupInfo(state.profile),
    grade: state.profile.grade,
    subjectCount: state.profile.subjects.length,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const state = await loadUserData(supabase, user.id);
    return NextResponse.json({
      state,
      ...setupSummary(state),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "読み込み失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface PutBody {
  state: CloudAppState;
  allowOnboardingReset?: boolean;
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = (await request.json()) as PutBody;
    if (!body?.state) {
      return NextResponse.json({ error: "state が必要です" }, { status: 400 });
    }

    const authUser = authUserFromSupabase(user);
    const options: SaveUserDataOptions | undefined = body.allowOnboardingReset
      ? { allowOnboardingReset: true }
      : undefined;

    await saveUserData(supabase, user.id, body.state, options, {
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
    });

    const saved = await loadUserData(supabase, user.id);
    const summary = setupSummary(saved);

    return NextResponse.json({
      ok: true,
      state: saved,
      ...summary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
