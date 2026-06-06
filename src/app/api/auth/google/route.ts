import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig, validateSupabaseConfig } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const { url, anonKey } = getSupabaseConfig();
  const configError = validateSupabaseConfig(url, anonKey);

  if (configError) {
    return NextResponse.redirect(
      `${origin}/login?error=config&message=${encodeURIComponent(configError)}`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return NextResponse.redirect(data.url);
}
