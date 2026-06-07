import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserRow } from "@/lib/userData";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "未認証" }, { status: 401 });
    }

    await ensureUserRow(supabase, user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "セットアップ失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
