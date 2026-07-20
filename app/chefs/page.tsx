"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { ChefFollowButton } from "@/app/components/chef-follow-button";
import type { Chef } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

type ChefRow = Chef & { recipes: { count: number }[]; chef_follows: { count: number }[] };

export default function ChefsPage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [chefs, setChefs] = useState<ChefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("chefs")
        .select("*, recipes(count), chef_follows(count)");
      const rows = ((data ?? []) as ChefRow[]).sort(
        (a, b) => (b.recipes[0]?.count ?? 0) - (a.recipes[0]?.count ?? 0)
      );
      setChefs(rows);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return chefs;
    return chefs.filter((c) => c.name.toLowerCase().includes(s));
  }, [chefs, search]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          👨‍🍳 {t("chefs.title")}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{t("chefs.subtitle")}</p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("chefs.search")}
          className="mt-5 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        {loading ? (
          <p className="mt-10 text-center text-sm text-zinc-500">...</p>
        ) : visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-500">{t("chefs.no_chefs")}</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((chef) => (
              <div
                key={chef.id}
                className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link href={`/chefs/${chef.id}`} className="flex flex-col items-center">
                  {chef.avatar_url && /^https?:\/\//i.test(chef.avatar_url) ? (
                    <img
                      src={chef.avatar_url}
                      alt={chef.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-900/40">
                      👨‍🍳
                    </span>
                  )}
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {chef.name}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {chef.recipes[0]?.count ?? 0} {t("chefs.recipes")} ·{" "}
                  {chef.chef_follows[0]?.count ?? 0} {t("chefs.followers")}
                </p>
                <div className="mt-3">
                  <ChefFollowButton chefId={chef.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
