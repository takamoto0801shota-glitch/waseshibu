import { NextRequest, NextResponse } from "next/server";
import { filterSubjects } from "@/lib/exclusions";
import { createDailyPlan } from "@/lib/planGenerator";
import { rhythmHint } from "@/lib/rhythmCoach";
import { requireUser, unauthorized } from "@/lib/supabase/api-auth";
import { UserProfile } from "@/lib/types";
import { MODE_HINTS, MODE_LABELS } from "@/lib/types";

interface PlanRequest {
  profile: UserProfile;
  todayStudyMinutes?: number;
  todayRewardMinutes?: number;
  /** @deprecated */
  todayMinutes?: number;
}

export async function POST(request: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  try {
    const body = (await request.json()) as PlanRequest;
    const profile = {
      ...body.profile,
      subjects: filterSubjects(body.profile.subjects),
    };
    const studyMinutes = body.todayStudyMinutes ?? body.todayMinutes ?? 90;
    const rewardMinutes = body.todayRewardMinutes ?? 30;
    const plan = createDailyPlan(profile, studyMinutes, rewardMinutes);

    return NextResponse.json({
      ...plan,
      coachMessage: `${MODE_LABELS[plan.mode]}（${MODE_HINTS[plan.mode]}）。勉強${studyMinutes}分・自由${rewardMinutes}分を${rhythmHint(plan.rhythm)}の交互で進めます。`,
    });
  } catch {
    return NextResponse.json({ error: "生成失敗" }, { status: 500 });
  }
}
