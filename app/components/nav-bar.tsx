"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", data.user.id)
            .maybeSingle();
          setIsAdmin(!!profile?.is_admin);
        }
      } catch {
        /* auth lock race — safe to ignore */
      }
    })();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/market", label: "Recipes Market" },
    ...(user ? [{ href: "/dashboard/recipes", label: "My Recipes" }] : []),
    { href: "/explore", label: "Meal Plans Market" },
    ...(user ? [{ href: "/dashboard/plans", label: "My Meal Plans" }] : []),
    ...(isAdmin ? [{ href: "/admin/users", label: "⚙ Admin" }] : []),
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      {/* Row 1: Brand + Profile + Logout */}
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
        <Link
          href={user ? "/dashboard/recipes" : "/"}
          className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          HomeRecipe
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={`/user/${user.id}`}
                title={user.email ?? "Profile"}
                className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-indigo-100 text-xs sm:text-sm font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
              >
                {(user.email?.[0] ?? "U").toUpperCase()}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-md border border-zinc-300 bg-white px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {loggingOut ? "..." : "Log Out"}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-3 py-1 text-xs sm:text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Row 2: Navigation links — horizontally scrollable on mobile */}
      <div className="border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1.5 -mx-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-shrink-0 rounded-md px-2.5 py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive(link.href)
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
