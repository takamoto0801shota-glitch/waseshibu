/** サーバー実行時に読む（Railway Variables 変更後すぐ反映） */
export function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return { url, anonKey };
}

export function validateSupabaseConfig(
  url: string,
  anonKey: string
): string | null {
  if (!url || !anonKey) {
    return "Supabase の環境変数が未設定です。Railway に SUPABASE_URL と SUPABASE_ANON_KEY を設定してください";
  }
  if (url.includes("xxxxx") || url.includes("placeholder")) {
    return "SUPABASE_URL がプレースホルダーのままです。Supabase Dashboard の実際の URL に置き換えてください";
  }
  if (anonKey.includes("...") || anonKey.length < 20) {
    return "SUPABASE_ANON_KEY がプレースホルダーまたは短すぎます。Supabase Dashboard → API の key をそのままコピーしてください";
  }
  const validKey =
    anonKey.startsWith("eyJ") || anonKey.startsWith("sb_publishable_");
  if (!validKey) {
    return "SUPABASE_ANON_KEY の形式が不正です（eyJ... または sb_publishable_... を設定してください）";
  }
  return null;
}
