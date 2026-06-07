import { NextRequest, NextResponse } from "next/server";
import { filterSubjects } from "@/lib/exclusions";
import { requireUser, unauthorized } from "@/lib/supabase/api-auth";
import { createDailyPlan } from "@/lib/planGenerator";
import { rhythmHint, getBaselineRhythm } from "@/lib/rhythmCoach";
import { UserProfile } from "@/lib/types";
import { MODE_LABELS } from "@/lib/types";

interface PlanRequest {
  profile: UserProfile;
  todayMinutes: number;
}

export async function POST(request: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  try {
    const body = (await request.json()) as PlanRequest;
    const profile = {
      ...body.profile,
      subjects: filterSubjects(body.profile.subjects),
    };
    const plan = createDailyPlan(profile, body.todayMinutes ?? 150);
    const baseline = getBaselineRhythm(plan.mode);

    return NextResponse.json({
      ...plan,
      coachMessage: `${MODE_LABELS[plan.mode]}でスタート。設定時間（勉強＋自由時間）は${body.todayMinutes ?? 150}分。${rhythmHint(baseline)}から調整します。`,
    });
  } catch {
    return NextResponse.json({ error: "生成失敗" }, { status: 500 });
  }
}
