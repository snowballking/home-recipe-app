"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NavBar } from "@/app/components/nav-bar";
import { ChefFollowButton } from "@/app/components/chef-follow-button";
import { FollowButton } from "@/app/components/follow-button";
import type { Chef } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/language-context";

type ChefRow = Chef & { recipes: { count: number }[]; chef_follows: { count: number }[] };

type AppChefRow = {
  id: string;
  displayname: string | null;
  avatar_url: string | null;
  recipe_count: number;
  follower_count: number;
};

// Unified directory entry — an external curated chef or an app member.
type DirectoryEntry = {
  kind: "external" | "app";
  id: string;
  name: string;
  avatar_url: string | null;
  recipeCount: number;
  followerCount: number;
};

export default function ChefsPage() {
  const supabase = createClient();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: chefData }, { data: appChefData }] = await Promise.all([
        supabase.from("chefs").select("*, recipes(count), chef_follows(count)"),
        supabase.rpc("list_app_chefs"),
      ]);

      const external: DirectoryEntry[] = ((chefData ?? []) as ChefRow[]).map((c) => ({
        kind: "external",
        id: c.id,
        name: c.name,
        avatar_url: c.avatar_url,
        recipeCount: c.recipes[0]?.count ?? 0,
        followerCount: c.chef_follows[0]?.count ?? 0,
      }));

      const app: DirectoryEntry[] = ((appChefData ?? []) as AppChefRow[]).map((p) => ({
        kind: "app",
        id: p.id,
        name: p.displayname ?? "Anonymous",
        avatar_url: p.avatar_url,
        recipeCount: Number(p.recipe_count) || 0,
        followerCount: p.follower_count ?? 0,
      }));

      const merged = [...external, ...app].sort((a, b) => b.recipeCount - a.recipeCount);
      setEntries(merged);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((c) => c.name.toLowerCase().includes(s));
  }, [entries, search]);

  return (
    <div className="min-h-full bg-background">
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
            {visible.map((entry) => (
              <div
                key={`${entry.kind}-${entry.id}`}
                className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link
                  href={entry.kind === "external" ? `/chefs/${entry.id}` : `/user/${entry.id}`}
                  className="flex flex-col items-center"
                >
                  {entry.avatar_url && /^https?:\/\//i.test(entry.avatar_url) ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-900/40">
                      👨‍🍳
                    </span>
                  )}
                  <span
                    className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      entry.kind === "external"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    }`}
                  >
                    {entry.kind === "external" ? t("chefs.featured") : t("chefs.community")}
                  </span>
                  <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {entry.name}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {entry.recipeCount} {t("chefs.recipes")} · {entry.followerCount} {t("chefs.followers")}
                </p>
                <div className="mt-3">
                  {entry.kind === "external" ? (
                    <ChefFollowButton chefId={entry.id} />
                  ) : (
                    <FollowButton targetUserId={entry.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
