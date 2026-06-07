import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/supabase/origin";
import {
  applyPendingCookies,
  createRouteHandlerClient,
} from "@/lib/supabase/route-handler";
import { ensureUserRow } from "@/lib/userData";

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    const msg = encodeURIComponent(oauthError);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${msg}`);
  }

  if (code) {
    const redirectUrl = `${origin}${next.startsWith("/") ? next : "/"}`;
    const { supabase, pendingCookies } = createRouteHandlerClient(request);

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await ensureUserRow(supabase, user);
        } catch {
          /* user_data 未作成でもログインは継続 */
        }
      }
      const response = NextResponse.redirect(redirectUrl);
      applyPendingCookies(response, pendingCookies);
      return response;
    }

    const msg = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${msg}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
