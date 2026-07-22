"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { useAuth } from "@/lib/auth/auth-context";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, displayName } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();
  const { locale, setLocale, t } = useLanguage();

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/discover", label: t("nav.explore"), shortLabel: t("nav.explore_short"), match: ["/discover"] },
    { href: "/market", label: t("nav.recipes"), shortLabel: t("nav.recipes_short"), match: ["/market", "/dashboard/recipes"] },
    { href: "/chefs", label: t("nav.chefs"), shortLabel: t("nav.chefs_short"), match: ["/chefs"] },
    { href: "/explore", label: t("nav.meal_plans"), shortLabel: t("nav.meal_plans_short"), match: ["/explore", "/dashboard/plans"] },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isLinkActive(match: string[]) {
    return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      {/* Row 1: Brand + Admin + Profile + Logout */}
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
        <Link
          href={user ? "/market" : "/"}
          className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          JuFAN 煮饭
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin/users"
              className={`rounded-md px-2 py-1 text-xs sm:text-sm font-medium transition-colors ${
                isActive("/admin/users")
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {t("nav.admin")}
            </Link>
          )}

          {user ? (
            <>
              <Link
                href={`/user/${user.id}`}
                title={user.email ?? "Profile"}
                className="flex items-center gap-1.5 rounded-full bg-indigo-50 pl-1 pr-2.5 py-1 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                  {(displayName?.[0] ?? "U").toUpperCase()}
                </span>
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 max-w-[80px] truncate">
                  {displayName}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "zh" : "en")}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                title={locale === "en" ? "切换中文" : "Switch to English"}
              >
                {locale === "en" ? "中文" : "EN"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {loggingOut ? "..." : t("nav.log_out")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "zh" : "en")}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                title={locale === "en" ? "切换中文" : "Switch to English"}
              >
                {locale === "en" ? "中文" : "EN"}
              </button>
              <Link
                href="/login"
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs sm:text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t("nav.sign_in")}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Navigation links — equal width, text stacks on mobile */}
      <div className="border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-6xl px-2 sm:px-4">
          <div className="grid py-1" style={{ gridTemplateColumns: `repeat(${navLinks.length}, 1fr)` }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-1 py-1.5 text-center text-[11px] leading-tight sm:text-sm sm:leading-normal font-medium transition-colors ${
                  isLinkActive(link.match)
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                {/* Mobile: stacked text, Desktop: single line */}
                <span className="sm:hidden whitespace-pre-line">{link.label}</span>
                <span className="hidden sm:inline">{link.shortLabel}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
