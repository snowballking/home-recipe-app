"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useLanguage } from "@/lib/i18n/language-context";

const ROUTES = {
  recipes: { market: "/market", mine: "/dashboard/recipes" },
  plans: { market: "/explore", mine: "/dashboard/plans" },
} as const;

interface CollectionToggleProps {
  kind: keyof typeof ROUTES;
  active: "market" | "mine";
}

/**
 * Market/Mine segmented pill at the top of the merged Recipes and Meal Plans
 * tabs. Always occupies the same height in every auth state (invisible while
 * auth resolves or when signed out) so page layout never jumps.
 */
export function CollectionToggle({ kind, active }: CollectionToggleProps) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const hidden = loading || !user;

  const segment = (side: "market" | "mine") =>
    `flex-1 rounded-full px-4 py-1.5 text-center text-xs sm:text-sm font-medium transition-colors ${
      active === side
        ? "bg-indigo-600 text-white"
        : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
    }`;

  return (
    <div
      aria-hidden={hidden || undefined}
      className={`mx-auto flex w-full max-w-xs rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900${
        hidden ? " invisible pointer-events-none" : ""
      }`}
    >
      <Link href={ROUTES[kind].market} className={segment("market")}>
        {t("collection.market")}
      </Link>
      <Link href={ROUTES[kind].mine} className={segment("mine")}>
        {t("collection.mine")}
      </Link>
    </div>
  );
}
