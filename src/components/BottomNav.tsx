"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HOME_PATH } from "@/lib/onboardingGate";

const items = [
  { href: HOME_PATH, label: "ホーム" },
  { href: "/mypage", label: "マイページ" },
];

export function BottomNav() {
  const pathname = usePathname();
  const hidden = ["/onboarding", "/menu", "/session", "/complete"];
  if (hidden.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-50">
      <div className="max-w-md mx-auto flex">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 py-4 text-center text-sm font-semibold ${
                active ? "text-primary border-t-2 border-primary -mt-[2px]" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
