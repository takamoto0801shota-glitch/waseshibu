import { NextRequest, NextResponse } from "next/server";
import { buildRoadmap } from "@/lib/roadmapGenerator";
import { DailyPlan, ScheduleBlock, SessionPhase, UserProfile } from "@/lib/types";

interface RoadmapRequest {
  profile: UserProfile;
  plan: DailyPlan;
  todaySubjectIds: string[];
  currentBlock?: ScheduleBlock | null;
  sessionPhase?: SessionPhase | null;
}

async function refineWithOpenAI(
  body: RoadmapRequest,
  fallback: ReturnType<typeof buildRoadmap>
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const upcoming = fallback
    .filter((s) => s.status === "upcoming")
    .map((s) => `${s.type}:${s.label}`)
    .join("、");

  const prompt = `欲望OSのロードマップを微調整してください。固定プランではなく現在のリズムからの投影です。

【モード】${body.plan.mode}
【リズム】勉強${body.plan.rhythm.studyMinutes}分→自由${body.plan.rhythm.rewardMinutes}分
【残り時間】${body.plan.targetStudyMinutes - body.plan.studyDoneMinutes - body.plan.rewardDoneMinutes}分
【投影ステップ】${upcoming || "なし"}

ルール:
- 報酬は「フリータイム」と表記（TikTok等は使わない）
- 勉強は「科目名+分数」形式
- 順序は study→reward の交互を維持
- 完了したステップは変更しない

出力JSON: {"steps":[{"id":"...","type":"study|reward","label":"...","status":"upcoming","minutes":30}]}
status=upcoming のみ返す。idはそのまま。`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "JSONのみ返してください。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const aiSteps = parsed.steps ?? [];
    if (aiSteps.length === 0) return fallback;

    const map = new Map(aiSteps.map((s: { id: string }) => [s.id, s]));
    return fallback.map((step) => {
      if (step.status !== "upcoming") return step;
      const patch = map.get(step.id) as
        | { label?: string; minutes?: number }
        | undefined;
      if (!patch) return step;
      return {
        ...step,
        label: patch.label ?? step.label,
        minutes: patch.minutes ?? step.minutes,
      };
    });
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RoadmapRequest;
    const base = buildRoadmap(body.profile, body.plan, {
      todaySubjectIds: body.todaySubjectIds,
      currentBlock: body.currentBlock,
      sessionPhase: body.sessionPhase,
    });
    const steps = await refineWithOpenAI(body, base);
    return NextResponse.json({ steps });
  } catch {
    return NextResponse.json({ error: "生成失敗" }, { status: 500 });
  }
}
