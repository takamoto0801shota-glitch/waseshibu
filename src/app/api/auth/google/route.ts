import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig, validateSupabaseConfig } from "@/lib/supabase/env";
import { getRequestOrigin } from "@/lib/supabase/origin";
import {
  applyPendingCookies,
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const { url, anonKey } = getSupabaseConfig();
  const configError = validateSupabaseConfig(url, anonKey);

  if (configError) {
    return NextResponse.redirect(
      `${origin}/login?error=config&message=${encodeURIComponent(configError)}`
    );
  }

  const { supabase, pendingCookies } = createRouteHandlerClient(request);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    const msg = encodeURIComponent(error?.message ?? "OAuth開始に失敗");
    return NextResponse.redirect(`${origin}/login?error=auth&message=${msg}`);
  }

  const response = NextResponse.redirect(data.url);
  applyPendingCookies(response, pendingCookies);
  return response;
}
