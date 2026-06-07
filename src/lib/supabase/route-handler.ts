import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { getSupabaseConfig } from "./env";

type PendingCookie = { name: string; value: string; options: CookieOptions };

/** Route Handler 用: Cookie を配列に蓄えて Response へ転送 */
export function createRouteHandlerClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseConfig();
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  return { supabase, pendingCookies };
}

export function applyPendingCookies(
  response: Response,
  pendingCookies: PendingCookie[]
) {
  pendingCookies.forEach(({ name, value, options }) => {
    (response as import("next/server").NextResponse).cookies.set(
      name,
      value,
      options
    );
  });
}
