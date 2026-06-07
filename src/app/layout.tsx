import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppRouteGuard } from "@/components/AppRouteGuard";
import { AuthProvider } from "@/components/AuthProvider";
import { getSupabaseConfig } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "わせしぶ",
  description: "欲望を主役にした、勉強の意思決定OS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4a9b8e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { url, anonKey } = getSupabaseConfig();

  return (
    <html lang="ja">
      <body>
        <AuthProvider supabaseUrl={url} supabaseAnonKey={anonKey}>
          <Suspense fallback={null}>
            <AppRouteGuard>{children}</AppRouteGuard>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
