import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/supabase/api-auth";
import {
  adjustRhythm,
  moodCoachMessage,
  rhythmHint,
} from "@/lib/rhythmCoach";
import {
  MoodCheck,
  RhythmState,
  StudyMode,
  UserProfile,
} from "@/lib/types";
import { MODE_LABELS } from "@/lib/types";

interface RhythmRequest {
  mood: MoodCheck;
  rhythm: RhythmState;
  mode: StudyMode;
  totalDoneMinutes: number;
  targetTotalMinutes: number;
  sessionCount: number;
  profile?: UserProfile;
}

async function coachWithOpenAI(
  body: RhythmRequest,
  fallback: RhythmState
): Promise<{ rhythm: RhythmState; message: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const message = moodCoachMessage(body.mood, fallback);
  if (!apiKey) return { rhythm: fallback, message };

  const prompt = `あなたは勉強リズムを最適化するコーチです。固定ポモドーロではありません。

【モード】${MODE_LABELS[body.mode]}（開始リズムの参考）
【現在のリズム】勉強${body.rhythm.studyMinutes}分 → 自由${body.rhythm.rewardMinutes}分
【連続きつい回数】${body.rhythm.consecutiveTough}
【今日の消化】${body.totalDoneMinutes}/${body.targetTotalMinutes}分（勉強＋自由時間の合計）
【セッション数】${body.sessionCount}
【ユーザーの状態】${
    body.mood === "great"
      ? "絶好調（集中度高い→勉強延長）"
      : body.mood === "normal"
        ? "普通（維持）"
        : "きつい（疲労→短縮、連続なら自由時間追加）"
  }

【ルール】
- studyMinutes: 15〜90分
- rewardMinutes: 5〜30分
- 絶好調: study +15分程度
- 普通: 維持
- きつい: study -15分程度
- 連続きつい(2回以上): reward +10分程度

【出力JSON】
{"studyMinutes":45,"rewardMinutes":10,"consecutiveTough":0,"message":"一言コーチ"}`;

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

    if (!res.ok) return { rhythm: fallback, message };

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

    return {
      rhythm: {
        studyMinutes: Math.min(
          90,
          Math.max(15, parsed.studyMinutes ?? fallback.studyMinutes)
        ),
        rewardMinutes: Math.min(
          30,
          Math.max(5, parsed.rewardMinutes ?? fallback.rewardMinutes)
        ),
        consecutiveTough: fallback.consecutiveTough,
      },
      message: parsed.message ?? message,
    };
  } catch {
    return { rhythm: fallback, message };
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  try {
    const body = (await request.json()) as RhythmRequest;
    const fallback = adjustRhythm(body.rhythm, body.mood);
    const result = await coachWithOpenAI(body, fallback);

    return NextResponse.json({
      rhythm: result.rhythm,
      message: result.message,
      rhythmHint: rhythmHint(result.rhythm),
    });
  } catch {
    return NextResponse.json({ error: "調整失敗" }, { status: 500 });
  }
}
