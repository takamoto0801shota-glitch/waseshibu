import { NextResponse } from "next/server";
import { createClient } from "./server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

export function unauthorized() {
  return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
}
