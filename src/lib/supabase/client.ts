import { createBrowserClient } from "@supabase/ssr";

export function createClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
